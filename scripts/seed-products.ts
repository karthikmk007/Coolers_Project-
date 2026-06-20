/**
 * Seed the v3.0 `products` table from the 482 real LCBO rows in the legacy
 * `product` table, computing the taste profile + nutrition deterministically.
 *
 * Idempotent: clears `products` then re-inserts. Safe because ratings/reviews
 * that reference products are empty.
 *
 *   npx tsx scripts/seed-products.ts
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { deriveTaste, styleLabel, productBlurb } from "../src/lib/taste";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

type LegacyRow = {
  id: number;
  name: string;
  normalized_category: string;
  abv: number | null;
  price_cents: number | null;
  image_url: string | null;
  lcbo_id: string | null;
  brand: { name: string } | { name: string }[] | null;
};

function brandName(brand: LegacyRow["brand"]): string {
  if (!brand) return "Unknown";
  return Array.isArray(brand) ? brand[0]?.name ?? "Unknown" : brand.name ?? "Unknown";
}

async function main() {
  // 1. Read all legacy products with their brand name.
  const { data, error } = await sb
    .from("product")
    .select("id, name, normalized_category, abv, price_cents, image_url, lcbo_id, brand(name)")
    .order("id");

  if (error) { console.error("Read failed:", error.message); process.exit(1); }
  const legacy = (data ?? []) as unknown as LegacyRow[];
  console.log(`Read ${legacy.length} legacy products.`);

  // 2. Map each → a v3.0 `products` insert row.
  const rows = legacy.map((p) => {
    const brand = brandName(p.brand);
    const style = styleLabel(p.name, p.normalized_category);
    const t = deriveTaste(p.name, style, p.abv);
    return {
      lcbo_id:           p.lcbo_id ?? `legacy-${p.id}`,
      brand,
      name:              p.name,
      style,
      abv:               p.abv,
      region:            null as string | null,
      country:           "Canada",
      price:             p.price_cents != null ? Math.round(p.price_cents) / 100 : null,
      image_url:         p.image_url,
      thumbnail_url:     p.image_url, // shop/home cards key off thumbnail_url
      description:       productBlurb(brand, style, p.abv, t.flavorNotes),
      tags:              t.flavorNotes.slice(0, 3),
      taste_sweet:       t.sweet,
      taste_bold:        t.bold,
      taste_carb:        t.carb,
      flavor_notes:      t.flavorNotes,
      pairs_with:        t.pairsWith,
      is_lcbo_exclusive: false,
    };
  });

  // 3. Clear existing rows (idempotent re-runs).
  const { error: delErr } = await sb
    .from("products")
    .delete()
    .gte("created_at", "1900-01-01T00:00:00Z");
  if (delErr) { console.error("Clear failed:", delErr.message); process.exit(1); }

  // 4. Batch insert.
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { error: insErr } = await sb.from("products").insert(batch);
    if (insErr) { console.error(`Insert batch ${i} failed:`, insErr.message); process.exit(1); }
    inserted += batch.length;
    process.stdout.write(`  inserted ${inserted}/${rows.length}\r`);
  }
  console.log(`\nInserted ${inserted} products.`);

  // 5. Verify.
  const { count } = await sb.from("products").select("*", { count: "exact", head: true });
  const { data: sample } = await sb
    .from("products")
    .select("name, style, abv, taste_sweet, taste_bold, taste_carb, flavor_notes, pairs_with")
    .limit(5);
  console.log(`\nVerification — products count: ${count}`);
  for (const s of (sample ?? []) as any[]) {
    console.log(
      `  ${s.name.slice(0, 30).padEnd(30)} | ${String(s.style).padEnd(13)} abv=${String(s.abv).padEnd(4)} ` +
      `sweet=${s.taste_sweet} bold=${s.taste_bold} carb=${s.taste_carb} notes=[${s.flavor_notes.join(", ")}]`
    );
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
