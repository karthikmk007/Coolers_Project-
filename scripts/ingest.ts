/**
 * CRACKED Phase 1 — RTD Discovery Ingestion Script
 * =================================================
 * Queries the lcbo.dev GraphQL API for cooler/RTD products,
 * enriches each one with rule-based flavor + nutrition tags,
 * and upserts 50 rows into the Supabase `products` table.
 *
 * Run:  npx tsx scripts/ingest.ts
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Load .env.local from project root
const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    "❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─────────────────────────────────────────────────────────────
// LCBO GraphQL API
// ─────────────────────────────────────────────────────────────
const GQL_ENDPOINT = "https://api.lcbo.dev/graphql";
const CATEGORY_SLUG = "coolers"; // confirmed via category introspection
const TARGET_COUNT = 75;

const PRODUCTS_QUERY = `
  query GetCoolers($cursor: String) {
    products(
      filters: { categorySlug: "${CATEGORY_SLUG}", isBuyable: true }
      pagination: { first: 75, after: $cursor }
      sortBy: SELL_RANK_MONTHLY
      sortDirection: DESC
    ) {
      edges {
        node {
          sku
          name
          producerName
          priceInCents
          alcoholPercent
          unitVolumeMl
          thumbnailUrl
          primaryCategory
          shortDescription
        }
        cursor
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

interface LcboProduct {
  sku: string;
  name: string;
  producerName: string | null;
  priceInCents: number;
  alcoholPercent: number | null;
  unitVolumeMl: number | null;
  thumbnailUrl: string | null;
  primaryCategory: string | null;
  shortDescription: string | null;
}

async function fetchLcboProducts(): Promise<LcboProduct[]> {
  console.log(
    `\n🔍  Fetching up to ${TARGET_COUNT} products from lcbo.dev (categorySlug: "${CATEGORY_SLUG}")…`
  );

  const res = await fetch(GQL_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: PRODUCTS_QUERY, variables: {} }),
  });

  if (!res.ok) {
    throw new Error(`LCBO API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as {
    data?: { products?: { edges?: { node: LcboProduct }[] } };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new Error(`GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`);
  }

  const edges = json.data?.products?.edges ?? [];
  const products = edges.slice(0, TARGET_COUNT).map((e) => e.node);
  console.log(`✅  Fetched ${products.length} products`);
  return products;
}

// ─────────────────────────────────────────────────────────────
// Rule-based enrichment (deterministic, no LLM cost)
// ─────────────────────────────────────────────────────────────

/** Keyword → flavor tag mappings (checked in order) */
const FLAVOR_RULES: [RegExp, string][] = [
  [/lemon(?!ade)|lime|citrus|grapefruit/i, "citrus"],
  [/lemonade/i, "citrus"],
  [/strawberr|raspberr|blueberr|blackberr|cranberr|wild.?berry|mixed.?berry|berry/i, "berry"],
  [/mango|passion.?fruit|guava|papaya/i, "tropical"],
  [/pineapple/i, "tropical"],
  [/coconut/i, "tropical"],
  [/peach|nectarine|apricot/i, "stone fruit"],
  [/cherry|cherri/i, "cherry"],
  [/watermelon|melon/i, "melon"],
  [/apple(?!.?jack)|cider/i, "apple"],
  [/grape(?!fruit)/i, "grape"],
  [/cucumber/i, "garden"],
  [/mint|mojito/i, "herbal"],
  [/ginger/i, "spiced"],
  [/iced.?tea|hard.?tea|tea/i, "tea"],
  [/coffee|espresso|mocha/i, "coffee"],
  [/pomegranate/i, "berry"],
  [/hibiscus|rose/i, "floral"],
  [/vanilla/i, "vanilla"],
  [/soda|seltzer|sparkling|natural|plain/i, "clean"],
  [/caesar|clamato/i, "savoury"],
];

function deriveFlavorTags(name: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const [pattern, tag] of FLAVOR_RULES) {
    if (pattern.test(name) && !seen.has(tag)) {
      seen.add(tag);
      tags.push(tag);
    }
  }

  return tags.length > 0 ? tags : ["neutral"];
}

/**
 * Sweetness tier heuristic:
 *  low    — hard seltzers, vodka sodas, dry ciders
 *  high   — lemonade, juice blends, cocktail mixes, Caesars
 *  medium — everything else (regular coolers, teas, ciders)
 */
function deriveSweetnessTier(name: string): "low" | "medium" | "high" {
  const n = name.toLowerCase();

  if (/seltzer|vodka.?soda|soda.?water|hard.?sparkling|dry.?cider|brut/.test(n))
    return "low";

  if (
    /lemonade|juice|punch|cocktail|mai.?tai|margarita|bahama|sangria|daiquiri|pina.?col|spritz|caesar|clamato|sour/.test(n)
  )
    return "high";

  return "medium";
}

/**
 * Rough calorie/sugar estimates.
 * All marked is_estimated = true — never present as verified facts.
 *
 * Formula:
 *   Alcohol kcal = abv% × volume_ml × 0.789 g/mL × 7 kcal/g
 *   Sugar kcal   = sugar_g × 4 kcal/g
 *   sugar_g estimated from sweetness tier + volume
 */
function estimateNutrition(
  name: string,
  abv: number | null,
  volumeMl: number | null
): { sugar_estimate_g: number | null; kcal_estimate: number | null } {
  if (!abv || !volumeMl) return { sugar_estimate_g: null, kcal_estimate: null };

  const alcohol_g = (abv / 100) * volumeMl * 0.789;
  const kcal_from_alcohol = alcohol_g * 7;

  const tier = deriveSweetnessTier(name);
  // g sugar per 100 mL: low ≈ 1–2, medium ≈ 5–6, high ≈ 10–12
  const sugar_per_100ml = tier === "low" ? 1.5 : tier === "medium" ? 5.5 : 11;
  const sugar_estimate_g = Math.round((sugar_per_100ml * volumeMl) / 100);
  const kcal_estimate = Math.round(kcal_from_alcohol + sugar_estimate_g * 4);

  return { sugar_estimate_g, kcal_estimate };
}

interface EnrichedProduct {
  sku: string;
  name: string;
  producer: string | null;
  price_cents: number;
  abv: number | null;
  volume_ml: number | null;
  image_url: string | null;
  flavor_tags: string[];
  sweetness_tier: "low" | "medium" | "high";
  sugar_estimate_g: number | null;
  kcal_estimate: number | null;
  is_estimated: boolean;
}

function enrich(raw: LcboProduct): EnrichedProduct {
  const { sugar_estimate_g, kcal_estimate } = estimateNutrition(
    raw.name,
    raw.alcoholPercent,
    raw.unitVolumeMl
  );

  return {
    sku: raw.sku,
    name: raw.name,
    producer: raw.producerName ?? null,
    price_cents: raw.priceInCents,
    abv: raw.alcoholPercent ?? null,
    volume_ml: raw.unitVolumeMl ?? null,
    image_url: raw.thumbnailUrl ?? null,
    flavor_tags: deriveFlavorTags(raw.name),
    sweetness_tier: deriveSweetnessTier(raw.name),
    sugar_estimate_g,
    kcal_estimate,
    is_estimated: true,
  };
}

// ─────────────────────────────────────────────────────────────
// Migration guard — ensure products table exists
// ─────────────────────────────────────────────────────────────
const MIGRATION_SQL = `
-- Run this once in Supabase Dashboard → SQL Editor
-- (or via: npx supabase db push if you have CLI auth configured)

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null unique,
  name             text not null,
  producer         text,
  price_cents      int  not null,
  abv              numeric(5,2),
  volume_ml        int,
  image_url        text,
  flavor_tags      text[]   not null default '{}',
  sweetness_tier   text     check (sweetness_tier in ('low', 'medium', 'high')),
  sugar_estimate_g numeric(6,1),
  kcal_estimate    int,
  is_estimated     boolean not null default true,
  created_at       timestamptz not null default now()
);

create index if not exists products_sweetness_idx   on products (sweetness_tier);
create index if not exists products_flavor_tags_idx on products using gin (flavor_tags);
create index if not exists products_abv_idx         on products (abv);

alter table products enable row level security;
create policy "public can read products" on products for select using (true);
`.trim();

async function ensureTableExists(): Promise<boolean> {
  const { error } = await supabase.from("products").select("id").limit(1);
  if (!error) return true; // table exists

  if (error.message.includes("does not exist") || error.message.includes("schema cache")) {
    console.error("\n❌  The `products` table does not exist yet.");
    console.error(
      "\n   Apply migration 005_discover_products.sql first:\n" +
      "   1.  Open Supabase Dashboard → SQL Editor\n" +
      "   2.  Run the file at: supabase/migrations/005_discover_products.sql\n" +
      "   3.  Re-run this script.\n" +
      "\n   SQL to paste:\n"
    );
    console.error(MIGRATION_SQL);
    return false;
  }

  throw new Error(`Unexpected Supabase error: ${error.message}`);
}

// ─────────────────────────────────────────────────────────────
// Supabase upsert
// ─────────────────────────────────────────────────────────────
async function upsertProducts(products: EnrichedProduct[]): Promise<number> {
  console.log(`\n💾  Upserting ${products.length} rows into Supabase…`);

  const { data, error } = await supabase
    .from("products")
    .upsert(products, { onConflict: "sku" })
    .select("sku");

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}\n${error.details ?? ""}`);
  }

  return data?.length ?? 0;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  CRACKED — Phase 1 Ingest");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  const tableReady = await ensureTableExists();
  if (!tableReady) process.exit(1);

  const raw = await fetchLcboProducts();

  console.log("\n🏷   Enriching with rule-based tagger…");
  const enriched = raw.map(enrich);

  // Print a sample for verification
  console.log("\nSample enrichment (first 3 products):");
  for (const p of enriched.slice(0, 3)) {
    console.log(
      `  ${p.name.padEnd(45)} | ${p.sweetness_tier.padEnd(6)} | [${p.flavor_tags.join(", ")}]` +
        (p.kcal_estimate ? ` | ~${p.kcal_estimate} kcal est.` : "")
    );
  }

  const inserted = await upsertProducts(enriched);

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅  Done — ${inserted} rows landed in \`products\``);
  console.log(`    categorySlug used: "${CATEGORY_SLUG}"`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
