/**
 * /discover — RTD Discovery Page (v3 schema)
 */

import { Suspense } from "react";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DiscoverGrid from "@/components/DiscoverGrid";
import { Nav } from "@/components/Nav";

export const revalidate = 300;

export const metadata = {
  title: "Discover RTDs — Cracked.",
  description:
    "Browse every cooler, hard seltzer, and cider at Ontario LCBO stores. Filter by flavour, sweetness, and ABV.",
};

export type DiscoverProduct = {
  id:            string;
  lcbo_id:       string;
  name:          string;
  brand:         string;
  style:         string | null;
  price:         number | null;
  abv:           number | null;
  image_url:     string | null;
  thumbnail_url: string | null;
  tags:          string[];
  taste_sweet:   number;
  taste_bold:    number;
  taste_carb:    number;
  flavor_notes:  string[];
  // Legacy compat fields (DiscoverGrid uses these)
  sku:               string;
  producer:          string | null;
  price_cents:       number;
  volume_ml:         number | null;
  flavor_tags:       string[];
  sweetness_tier:    "low" | "medium" | "high" | null;
  sugar_estimate_g:  number | null;
  kcal_estimate:     number | null;
  is_estimated:      boolean;
};

async function getProducts(): Promise<DiscoverProduct[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, lcbo_id, name, brand, style, price, abv, image_url, thumbnail_url, tags, taste_sweet, taste_bold, taste_carb, flavor_notes")
    .order("name");

  if (error) {
    console.error("Supabase fetch error:", error.message);
    return [];
  }

  // Map v3 schema → DiscoverProduct shape (bridge for existing DiscoverGrid)
  return (data ?? []).map((p) => ({
    ...p,
    sku:              p.lcbo_id,
    producer:         p.brand,
    price_cents:      Math.round((p.price ?? 0) * 100),
    volume_ml:        null,
    flavor_tags:      p.tags,
    sweetness_tier:   tasteToTier(p.taste_sweet),
    sugar_estimate_g: null,
    kcal_estimate:    null,
    is_estimated:     false,
  }));
}

function tasteToTier(sweet: number): "low" | "medium" | "high" {
  if (sweet < 45) return "low";
  if (sweet < 68) return "medium";
  return "high";
}

export default async function DiscoverPage() {
  const products = await getProducts();

  return (
    <main className="min-h-screen bg-cream text-ink">
      <Nav active="discover" />

      <div className="border-b border-ink/10 px-6 py-8 md:px-12">
        <p className="font-mono text-xs text-ink/40 uppercase tracking-widest mb-2">
          Cracked. / Discover
        </p>
        <h1 className="font-serif text-4xl md:text-5xl font-bold leading-tight">
          What&rsquo;s in the{" "}
          <span className="text-lime">cooler aisle?</span>
        </h1>
        <p className="mt-3 text-ink/60 text-sm max-w-xl">
          {products.length} RTDs, coolers &amp; seltzers from LCBO Ontario. Filter by vibe, sweetness, or ABV.
        </p>
      </div>

      <Suspense fallback={<div className="px-6 py-20 text-center font-mono text-ink/40 text-sm">Loading products…</div>}>
        <DiscoverGrid products={products} />
      </Suspense>
    </main>
  );
}
