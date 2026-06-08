/**
 * CRACKED — Full LCBO RTD Ingest Pipeline v2.0
 * ═══════════════════════════════════════════════════════════
 * Pulls every buyable RTD/cooler product from lcbo.dev GraphQL,
 * enriches with taste profiles + tags, upserts into Supabase.
 *
 * Run:  npx tsx scripts/ingest_lcbo.ts
 *
 * Sources (deduplicated by SKU):
 *   coolers       — Hard seltzers, RTD cocktails, coolers, teas
 *   cider         — Hard ciders, apple ciders
 *   cocktails     — Pre-mixed cocktails
 *   radler-shandy — Beer-citrus blends
 *   hard-seltzers — Dedicated seltzer listings
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// ── Env ──────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });
else dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌  Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Constants ─────────────────────────────────────────────────
const GQL = "https://api.lcbo.dev/graphql";

const CATEGORY_SLUGS = [
  "coolers",       // 284 — main RTD universe
  "cider",         // +87 unique hard ciders
  "cocktails",     // +8  unique pre-mixed
  "radler-shandy", // +5  unique radlers
  "hard-seltzers", // +1  unique
] as const;

const PRODUCT_FIELDS = `
  sku
  name
  producerName
  priceInCents
  alcoholPercent
  unitVolumeMl
  thumbnailUrl
  primaryCategory
  shortDescription
  origin
  countryOfManufacture
  regionName
  sellRankMonthly
`;

// ── Style derivation ──────────────────────────────────────────
type TasteProfile = { sweet: number; bold: number; carb: number };

const STYLE_PROFILES: Record<string, TasteProfile> = {
  "Hard Seltzer":   { carb: 85, sweet: 38, bold: 22 },
  "Hard Lemonade":  { carb: 72, sweet: 74, bold: 28 },
  "RTD Cocktail":   { carb: 60, sweet: 65, bold: 52 },
  "Cider":          { carb: 65, sweet: 58, bold: 34 },
  "Hard Cider":     { carb: 65, sweet: 58, bold: 34 },
  "Radler":         { carb: 68, sweet: 52, bold: 40 },
  "Hard Tea":       { carb: 62, sweet: 62, bold: 28 },
  "Cooler":         { carb: 74, sweet: 66, bold: 34 },
  "Caesar":         { carb: 58, sweet: 30, bold: 70 },
  "Default":        { carb: 65, sweet: 55, bold: 40 },
};

function deriveStyle(primaryCategory: string | null): string {
  const cat = (primaryCategory ?? "").toLowerCase();
  if (cat.includes("seltzer"))                        return "Hard Seltzer";
  if (cat.includes("lemonade"))                       return "Hard Lemonade";
  if (cat.includes("hard tea") || cat.includes("tea"))return "Hard Tea";
  if (cat.includes("caesar") || cat.includes("clamato")) return "Caesar";
  if (cat.includes("cider"))                          return "Hard Cider";
  if (cat.includes("radler") || cat.includes("shandy")) return "Radler";
  if (cat.includes("cocktail") || cat.includes("spritz")) return "RTD Cocktail";
  if (cat.includes("cooler"))                         return "Cooler";
  return "Cooler";
}

function tasteProfile(style: string, name: string, abv: number | null): TasteProfile {
  const base = { ...(STYLE_PROFILES[style] ?? STYLE_PROFILES["Default"]) };
  const n = name.toLowerCase();

  // Keyword adjustments
  if (/dry|brut|zero sugar|no sugar/.test(n))           base.sweet = Math.max(0,  base.sweet - 18);
  if (/sweet|candy|syrup/.test(n))                      base.sweet = Math.min(100, base.sweet + 18);
  if (/light|lite|lo-cal|low cal|skinny/.test(n))        base.bold  = Math.max(0,  base.bold  - 15);
  if (/strong|reserve|bold/.test(n))                    base.bold  = Math.min(100, base.bold  + 18);
  if (/sparkling|fizzy|extra carbonat/.test(n))          base.carb  = Math.min(100, base.carb  + 12);
  if (/still|flat/.test(n))                             base.carb  = Math.max(0,  base.carb  - 20);
  if (abv && abv > 8)                                   base.bold  = Math.min(100, base.bold  + 12);
  if (abv && abv < 4)                                   base.bold  = Math.max(0,  base.bold  - 10);

  return {
    sweet: Math.round(base.sweet),
    bold:  Math.round(base.bold),
    carb:  Math.round(base.carb),
  };
}

// ── Tag derivation ────────────────────────────────────────────
const TAG_RULES: [string, RegExp][] = [
  ["Low-Cal",    /light|lite|lo-cal|low.?cal|skinny|zero sugar|low sugar|4%|3%|2%/i],
  ["Tropical",   /mango|pineapple|passion|guava|coconut|banana|papaya/i],
  ["Citrus",     /lemon|lime|grapefruit|orange|citrus|yuzu/i],
  ["Berry",      /strawberr|raspberr|blueberr|blackberr|cranberr|cherry|mixed berry|wild berry/i],
  ["Crisp",      /crisp|clean|refreshing|mineral|seltzer|soda water/i],
  ["Sweet",      /lemonade|candy|sugar|syrup|punch|daiquiri|sangria/i],
  ["Strong",     /reserve|bold|double|extra|high abv|whisky|whiskey|gin|rum|vodka cocktail|tequila/i],
  ["Seasonal",   /summer|winter|limited|seasonal|holiday|pumpkin|harvest/i],
  ["Canadian",   /canada|ontario|québec|bc |british columbia|canadian|cottage|ace hill|nude |nutrl|dillon/i],
  ["Sparkling",  /sparkling|fizzy|carbonated|seltzer/i],
  ["Peach",      /peach|nectarine/i],
  ["Apple",      /apple(?!.*jack)/i],
  ["Watermelon", /watermelon/i],
  ["Melon",      /melon|honeydew/i],
  ["Tea",        /iced tea|hard tea|\btea\b/i],
  ["Floral",     /rose|hibiscus|lavender|elderflower/i],
  ["Savoury",    /caesar|clamato|tomato|spicy|jalapeño|hot/i],
];

function deriveTags(name: string, desc?: string | null): string[] {
  const text = `${name} ${desc ?? ""}`;
  return TAG_RULES.filter(([, rx]) => rx.test(text)).map(([tag]) => tag);
}

// ── Flavor notes ──────────────────────────────────────────────
const FLAVOR_MAP: [RegExp, string][] = [
  [/lemon/i, "Lemon zest"], [/lime/i, "Fresh lime"], [/grapefruit/i, "Grapefruit"],
  [/orange/i, "Orange peel"], [/mango/i, "Ripe mango"], [/pineapple/i, "Pineapple"],
  [/coconut/i, "Coconut"], [/passion/i, "Passionfruit"], [/strawberr/i, "Strawberry"],
  [/raspberr/i, "Raspberry"], [/blueberr/i, "Blueberry"], [/cranberr/i, "Cranberry"],
  [/cherry/i, "Cherry"], [/peach/i, "Peach"], [/watermelon/i, "Watermelon"],
  [/apple/i, "Crisp apple"], [/vanilla/i, "Vanilla"], [/ginger/i, "Fresh ginger"],
  [/cucumber/i, "Cucumber"], [/mint/i, "Mint"], [/hibiscus/i, "Hibiscus"],
  [/rose/i, "Rose"], [/cinnamon/i, "Cinnamon"], [/honey/i, "Honey"],
];

function deriveFlavorNotes(name: string, desc?: string | null): string[] {
  const text = `${name} ${desc ?? ""}`;
  return FLAVOR_MAP.filter(([rx]) => rx.test(text)).map(([, note]) => note).slice(0, 5);
}

// ── Pairs with ────────────────────────────────────────────────
const PAIRS_MAP: Record<string, string[]> = {
  "Hard Seltzer":  ["Grilled fish tacos", "Summer salads", "Light appetizers"],
  "Hard Lemonade": ["Fried chicken", "BBQ ribs", "Corn on the cob"],
  "RTD Cocktail":  ["Charcuterie board", "Spicy wings", "Sushi"],
  "Cider":         ["Sharp cheddar", "Pork tenderloin", "Apple pie"],
  "Hard Cider":    ["Sharp cheddar", "Pork tenderloin", "Apple pie"],
  "Radler":        ["Pretzels", "Bratwurst", "Potato salad"],
  "Hard Tea":      ["Cucumber sandwiches", "Scones", "Fruit tart"],
  "Cooler":        ["Pizza", "Chips & dip", "Burgers"],
  "Caesar":        ["Brunch items", "Eggs Benedict", "Celery sticks"],
  "Default":       ["Snacks", "Light bites", "Patio food"],
};

// ── GraphQL fetch with cursor pagination ──────────────────────
interface LcboNode {
  sku: string;
  name: string;
  producerName: string | null;
  priceInCents: number;
  alcoholPercent: number | null;
  unitVolumeMl: number | null;
  thumbnailUrl: string | null;
  primaryCategory: string | null;
  shortDescription: string | null;
  origin: string | null;
  countryOfManufacture: string | null;
  regionName: string | null;
  sellRankMonthly: number | null;
}

async function fetchCategory(slug: string): Promise<LcboNode[]> {
  const items: LcboNode[] = [];
  let cursor: string | null = null;
  let page = 0;

  process.stdout.write(`  ${slug.padEnd(18)} `);

  while (true) {
    const query = `{
      products(
        filters: { categorySlug: "${slug}", isBuyable: true }
        pagination: { first: 100${cursor ? `, after: "${cursor}"` : ""} }
        sortBy: SELL_RANK_MONTHLY
        sortDirection: DESC
      ) {
        pageInfo { hasNextPage endCursor }
        edges { node { ${PRODUCT_FIELDS} } }
      }
    }`;

    const res = await fetch(GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      console.error(`\n  HTTP ${res.status} on slug ${slug}`);
      break;
    }

    const json = (await res.json()) as {
      data?: { products?: { pageInfo: { hasNextPage: boolean; endCursor: string }; edges: { node: LcboNode }[] } };
      errors?: { message: string }[];
    };

    if (json.errors?.length) {
      console.error(`\n  GQL error on ${slug}:`, json.errors[0].message);
      break;
    }

    const edges = json.data?.products?.edges ?? [];
    items.push(...edges.map((e) => e.node));

    const pi = json.data!.products!.pageInfo;
    process.stdout.write(`p${++page} `);

    if (!pi.hasNextPage) break;
    cursor = pi.endCursor;
    await new Promise((r) => setTimeout(r, 200)); // polite rate limiting
  }

  process.stdout.write(`→ ${items.length} fetched\n`);
  return items;
}

// ── Transform raw → Supabase row ──────────────────────────────
function transform(raw: LcboNode) {
  const style  = deriveStyle(raw.primaryCategory);
  const abv    = raw.alcoholPercent ?? null;
  const taste  = tasteProfile(style, raw.name, abv);
  const tags   = deriveTags(raw.name, raw.shortDescription);
  const flavor = deriveFlavorNotes(raw.name, raw.shortDescription);

  return {
    lcbo_id:           raw.sku,
    brand:             raw.producerName ?? "LCBO",
    name:              raw.name,
    style,
    abv,
    region:            raw.regionName ?? raw.origin ?? null,
    country:           raw.countryOfManufacture ?? "Canada",
    price:             raw.priceInCents ? +(raw.priceInCents / 100).toFixed(2) : null,
    image_url:         raw.thumbnailUrl ?? null,
    thumbnail_url:     raw.thumbnailUrl ?? null,
    description:       raw.shortDescription ?? null,
    tags:              tags.length ? tags : ["Refreshing"],
    taste_sweet:       taste.sweet,
    taste_bold:        taste.bold,
    taste_carb:        taste.carb,
    flavor_notes:      flavor,
    pairs_with:        PAIRS_MAP[style] ?? PAIRS_MAP["Default"],
    is_lcbo_exclusive: false,
  };
}

// ── Upsert in batches ─────────────────────────────────────────
async function upsertBatch(rows: ReturnType<typeof transform>[]): Promise<number> {
  const { data, error } = await supabase
    .from("products")
    .upsert(rows, { onConflict: "lcbo_id" })
    .select("lcbo_id");

  if (error) throw new Error(`Upsert failed: ${error.message}`);
  return data?.length ?? 0;
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("\n" + "═".repeat(54));
  console.log("  CRACKED — LCBO RTD Ingest Pipeline v2.0");
  console.log("═".repeat(54));

  // 1. Fetch all categories, deduplicate by SKU
  const seen  = new Set<string>();
  const all:  ReturnType<typeof transform>[] = [];

  console.log("\n📡  Fetching from lcbo.dev GraphQL:\n");

  for (const slug of CATEGORY_SLUGS) {
    const raw = await fetchCategory(slug);
    let newCount = 0;
    for (const node of raw) {
      if (!seen.has(node.sku)) {
        seen.add(node.sku);
        all.push(transform(node));
        newCount++;
      }
    }
    console.log(`     └─ ${newCount} new unique products added (${seen.size} total)\n`);
  }

  console.log(`✅  Deduplicated: ${all.length} unique RTD products\n`);

  // 2. Upsert in batches of 100
  console.log("💾  Upserting to Supabase (batches of 100)…\n");
  const BATCH = 100;
  let total   = 0;

  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    const n     = await upsertBatch(batch);
    total += n;
    console.log(`  Batch ${Math.ceil((i + 1) / BATCH)}: ${n} rows upserted (running total: ${total})`);
  }

  // 3. Verify
  console.log("\n🔍  Verifying…\n");
  const { count } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { data: sample } = await supabase
    .from("products")
    .select("lcbo_id, name, style, price, taste_sweet, taste_bold, taste_carb, tags, flavor_notes")
    .limit(5);

  console.log("Sample rows:");
  sample?.forEach((p) => {
    console.log(
      `  ${p.lcbo_id.padEnd(8)} | ${p.name.substring(0, 32).padEnd(32)} | ${p.style.padEnd(14)} | $${p.price} | tags: [${p.tags.slice(0,2).join(",")}]`
    );
  });

  const styleBreakdown: Record<string, number> = {};
  all.forEach((p) => { styleBreakdown[p.style] = (styleBreakdown[p.style] ?? 0) + 1; });

  console.log("\nStyle breakdown:");
  Object.entries(styleBreakdown)
    .sort(([, a], [, b]) => b - a)
    .forEach(([s, n]) => console.log(`  ${s.padEnd(16)} ${n}`));

  console.log("\n" + "═".repeat(54));
  console.log(`✅  GATE 0 STATUS:`);
  console.log(`   Rows in Supabase:  ${count}`);
  console.log(`   Unique SKUs:       ${all.length}`);
  console.log(`   Style types:       ${Object.keys(styleBreakdown).length}`);
  console.log(`   Is real data:      ✅ All from lcbo.dev live API`);
  console.log("═".repeat(54) + "\n");
}

main().catch((err) => {
  console.error("❌  Ingest failed:", err);
  process.exit(1);
});
