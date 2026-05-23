import { Suspense } from "react";
import { Nav } from "@/components/Nav";
import { CatalogueFilter } from "@/components/CatalogueFilter";
import { ProductCard } from "@/components/ProductCard";
import { BrowseGridSkeleton } from "@/components/Skeleton";
import { supabase } from "@/lib/supabase";
import { Database } from "@/lib/database.types";

export const revalidate = 300;

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const q = typeof resolved.q === "string" ? resolved.q : "";
  const category =
    typeof resolved.category === "string" ? resolved.category : "";

  return (
    <main className="min-h-screen">
      <Nav active="catalogue" />

      <div className="px-6 md:px-12 py-10 max-w-screen-xl mx-auto">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mb-3">
          The Catalogue
        </div>
        <h1 className="font-display-roman text-5xl md:text-7xl tracking-tight text-ink mb-8">
          Everything{" "}
          <em className="font-display text-vermilion">cold</em>, indexed.
        </h1>

        {/* ── Filter bar + live result count ─────────────────────── */}
        <div className="flex items-center justify-between border-t border-b border-ink/10 py-3 mb-8">
          {/* CatalogueFilter is a client component — reads its own searchParams */}
          <CatalogueFilter />

          {/* ResultCount is a server component — fetches its own count */}
          <Suspense
            fallback={
              <span className="font-mono text-[10px] tracking-widest uppercase text-ink/20">
                —
              </span>
            }
          >
            <ResultCount category={category} q={q} />
          </Suspense>
        </div>

        {/* ── Product grid ───────────────────────────────────────── */}
        <Suspense key={`${q}-${category}`} fallback={<BrowseGridSkeleton />}>
          <ProductGrid q={q} category={category} />
        </Suspense>
      </div>
    </main>
  );
}

/* ── Result count (server) ──────────────────────────────────────── */

async function ResultCount({
  category,
  q,
}: {
  category: string;
  q: string;
}) {
  let query = supabase
    .from("product")
    .select("id", { count: "exact", head: true });

  if (category) query = query.eq("normalized_category", category);
  if (q) query = query.ilike("name", `%${q}%`);

  const { count } = await query;
  const n = count ?? 0;

  return (
    <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40">
      {n} Result{n !== 1 ? "s" : ""}
    </span>
  );
}

/* ── Product grid (server) ──────────────────────────────────────── */

type ProductWithBrand = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

async function ProductGrid({
  q,
  category,
}: {
  q: string;
  category: string;
}) {
  let query = supabase.from("product").select("*, brand(name)");

  if (category) query = query.eq("normalized_category", category);
  if (q) query = query.ilike("name", `%${q}%`);

  const { data: products, error } = await query.order("name").limit(200);

  if (error) {
    console.error("ProductGrid error:", error);
    return (
      <div className="border border-vermilion/20 bg-vermilion/5 text-vermilion font-mono text-sm p-8">
        Failed to load catalogue. The corner store is closed.
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="py-20 text-center border border-ink/10 text-ink/40 font-mono text-[10px] tracking-widest uppercase">
        No products found — adjust your filter.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
      {(products as unknown as ProductWithBrand[]).map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
