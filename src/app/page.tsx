import { Suspense } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/Nav";
import { ScrapeRunPanel } from "@/components/ScrapeRunPanel";
import { ProductCard } from "@/components/ProductCard";
import { FeaturedShelfSkeleton } from "@/components/Skeleton";
import { Database } from "@/lib/database.types";

export const revalidate = 300;

export default async function Home() {
  // ── Catalog stats ──────────────────────────────────────────────
  const [productRes, brandRes] = await Promise.all([
    supabase.from("product").select("id", { count: "exact", head: true }),
    supabase.from("brand").select("id", { count: "exact", head: true }),
  ]);

  const totalProducts = productRes.count ?? 0;
  const totalBrands = brandRes.count ?? 0;

  // ── Date string for the issue strip ───────────────────────────
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD

  return (
    <main className="min-h-screen flex flex-col">
      <Nav active="index" />

      {/* ── Issue / Date strip ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 md:px-12 py-3 border-b border-ink/10 font-mono text-[10px] tracking-widest uppercase text-ink/40">
        <span>Vol. 01 · Issue 001</span>
        <span>Toronto, ON</span>
        <span>{today}</span>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="flex-1 flex flex-col lg:flex-row lg:items-start gap-10 px-6 md:px-12 py-14 border-b border-ink/10">
        {/* Left: editorial headline */}
        <div className="flex-1">
          <h1 className="font-display-roman text-[clamp(3.5rem,8vw,8rem)] leading-[0.88] tracking-tight text-ink mb-8">
            A field guide to{" "}
            <em className="font-display text-vermilion">cracking</em> open a
            <br />
            can.
          </h1>

          <p className="font-sans text-lg text-ink/60 max-w-lg leading-relaxed mb-10">
            Cracked is an ML-engineered catalogue of every cooler, seltzer
            and cider sold across Ontario — scraped politely, normalised
            rigorously, and recommended via cosine similarity over flavour
            embeddings.
          </p>

          <div className="flex flex-wrap items-center gap-6">
            <Link
              href="/browse"
              className="inline-block px-7 py-3 bg-ink text-cream font-mono text-[11px] tracking-widest uppercase hover:bg-ink/80 transition-colors"
            >
              Open the Catalogue →
            </Link>
            {totalProducts > 0 && (
              <span className="font-mono text-[11px] tracking-widest uppercase text-ink/40">
                {totalProducts} Products · {totalBrands} Brands Indexed
              </span>
            )}
          </div>
        </div>

        {/* Right: live scrape panel */}
        <div className="lg:pt-2">
          <Suspense
            fallback={
              <div className="border border-ink/10 p-6 min-w-[280px] max-w-xs animate-pulse">
                <div className="h-3 w-1/3 bg-ink/10 mb-5" />
                <div className="space-y-2">
                  <div className="h-4 w-full bg-ink/10" />
                  <div className="h-4 w-2/3 bg-ink/10" />
                </div>
              </div>
            }
          >
            <ScrapeRunPanel />
          </Suspense>
        </div>
      </section>

      {/* ── Section 01: Featured Shelf ──────────────────────────── */}
      <section className="px-6 md:px-12 py-12 border-b border-ink/10">
        <div className="flex items-end justify-between mb-7">
          <div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mb-2">
              Section 01 — Featured Shelf
            </div>
            <h2 className="font-display-roman text-4xl md:text-5xl tracking-tight text-ink">
              What&apos;s{" "}
              <em className="font-display text-vermilion">cold</em> right now
            </h2>
          </div>
          <Link
            href="/browse"
            className="font-mono text-[10px] tracking-widest uppercase text-ink/50 underline underline-offset-4 decoration-ink/20 hover:text-ink hover:decoration-ink transition-colors mb-1"
          >
            See All →
          </Link>
        </div>

        <Suspense fallback={<FeaturedShelfSkeleton />}>
          <FeaturedShelf />
        </Suspense>
      </section>

      {/* ── Section 02: Methodology ─────────────────────────────── */}
      <section className="px-6 md:px-12 py-12 border-b border-ink/10">
        <div className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mb-3">
          Section 02 — Methodology
        </div>
        <h2 className="font-display-roman text-4xl md:text-5xl tracking-tight text-ink mb-10">
          Show the{" "}
          <em className="font-display text-vermilion">work</em>.
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink/10">
          <MethodCard
            number="01"
            title="Polite scraping"
            body="Python + requests, 3s rate-limit, custom UA, robots.txt respected. Idempotent upserts."
          />
          <MethodCard
            number="02"
            title="Normalised schema"
            body="Brand × product × scrape_run in Postgres. Every ingestion logged with status, counts, errors."
          />
          <MethodCard
            number="03"
            title="Vector recommendations"
            body="Flavour tags → embeddings → pgvector cosine similarity. Scores exposed in Dev Mode."
          />
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="flex items-center justify-between px-6 md:px-12 py-4 font-mono text-[10px] tracking-widest uppercase text-ink/30">
        <span>Cracked. © 2025</span>
        <span>ML Portfolio · Toronto, ON</span>
      </footer>
    </main>
  );
}

/* ── Featured Shelf (server component, own data fetch) ─────────── */

type ProductWithBrand = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

async function FeaturedShelf() {
  const { data: products, error } = await supabase
    .from("product")
    .select("*, brand(name)")
    .limit(6)
    .order("created_at", { ascending: false });

  if (error || !products || products.length === 0) {
    return (
      <p className="font-mono text-sm text-ink/40">
        No products yet — run the scraper to populate the shelf.
      </p>
    );
  }

  return (
    <div className="flex gap-6 overflow-x-auto pb-4 -mx-6 px-6 md:-mx-12 md:px-12 snap-x snap-mandatory">
      {(products as unknown as ProductWithBrand[]).map((p) => (
        <div key={p.id} className="flex-shrink-0 w-52 snap-start">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}

/* ── Methodology card ───────────────────────────────────────────── */

function MethodCard({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <div className="py-8 md:px-8 first:pl-0 last:pr-0">
      <div className="font-mono text-sm text-vermilion mb-4">{number}</div>
      <h3 className="font-sans font-semibold text-xl text-ink mb-3">{title}</h3>
      <p className="font-sans text-sm text-ink/60 leading-relaxed">{body}</p>
    </div>
  );
}
