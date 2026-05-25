import { supabase }          from "@/lib/supabase";
import { notFound }           from "next/navigation";
import Link                   from "next/link";
import { Suspense }           from "react";
import { Recommendations }    from "@/components/Recommendations";
import { FlavorProfile,
         extractFlavors }     from "@/components/FlavorProfile";
import { TasteSpectrum }      from "@/components/TasteSpectrum";
import { ProductInsights }    from "@/components/ProductInsights";
import { CommunityRatings }   from "@/components/CommunityRatings";
import { AddToShelfButton }   from "@/components/AddToShelfButton";

// ── Category maps ─────────────────────────────────────────────────────────────

const CAT_COLOR: Record<string, string> = {
  hard_seltzer: "bg-lime text-ink",
  cooler:        "bg-vermilion text-cream",
  cider:         "bg-amber text-cream",
  radler:        "bg-lime-dim text-ink",
  other:         "bg-ink text-cream",
};

const CAT_LABEL: Record<string, string> = {
  hard_seltzer: "Seltzer",
  cooler:        "Cooler",
  cider:         "Cider",
  radler:        "Radler",
  other:         "RTD",
};

// ── ML fetch helper ───────────────────────────────────────────────────────────

async function fetchTopSimilarity(productId: number): Promise<number | null> {
  const apiUrl = process.env.NEXT_PUBLIC_ML_API_URL;
  if (!apiUrl) return null;
  try {
    const r = await fetch(`${apiUrl}/recommend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, limit: 1, threshold: 0.1 }),
      next: { revalidate: 3600 },
    });
    if (!r.ok) return null;
    const json = await r.json();
    return (json.results?.[0]?.similarity as number) ?? null;
  } catch {
    return null;
  }
}

// ── Description generator ────────────────────────────────────────────────────

function makeDescription(
  brandName: string,
  catLabel:  string,
  abv:       number | null,
  flavors:   string[],
): string {
  const abvCtx = !abv
    ? ""
    : abv <= 4 ? "session-strength "
    : abv <= 6 ? "light "
    : abv <= 9 ? "medium-bodied "
    : "full-strength ";

  const flavorPart =
    flavors.length >= 2
      ? `${flavors[0]} and ${flavors[1]} forward`
      : flavors.length === 1
      ? `${flavors[0]} forward`
      : "clean and crisp";

  return (
    `A ${abvCtx}${catLabel.toLowerCase()} from ${brandName}. ` +
    `${flavorPart.charAt(0).toUpperCase() + flavorPart.slice(1)} ` +
    `with a balanced finish. Sourced from LCBO Ontario and indexed for the CRACKED catalogue.`
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }    = await params;
  const productId = parseInt(id, 10);
  if (isNaN(productId)) notFound();

  const { data: product, error } = await supabase
    .from("product")
    .select("*, brand(name)")
    .eq("id", productId)
    .single();

  if (error || !product) notFound();

  const p           = product as any;
  const brandName   = p.brand?.name ?? "Unknown Brand";
  const catKey      = p.normalized_category as string;
  const catLabel    = CAT_LABEL[catKey] ?? catKey;
  const tileColor   = CAT_COLOR[catKey] ?? CAT_COLOR.other;
  const price       = p.price_cents ? `$${(p.price_cents / 100).toFixed(2)}` : "—";
  const flavors     = extractFlavors(p.name);
  const description = makeDescription(brandName, catLabel, p.abv, flavors);
  const similarity  = await fetchTopSimilarity(productId);

  return (
    <div className="min-h-screen bg-cream flex flex-col">

      {/* ══ Sticky top bar ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-cream border-b border-ink/10 flex items-center justify-between px-4 md:px-8 py-3.5">
        <Link
          href="/browse"
          className="flex items-center gap-2.5 font-mono text-[10px] tracking-widest uppercase text-ink/60 hover:text-vermilion transition-colors"
        >
          <span className="text-base leading-none">×</span>
          <span>Close Catalog</span>
        </Link>

        <div className="absolute left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-widest text-ink/30 hidden md:block">
          {brandName} · {catLabel} · No.&nbsp;{p.lcbo_id ?? "—"}
        </div>

        <div className="flex items-center gap-2">
          {/* Bookmark */}
          <button
            aria-label="Bookmark"
            className="w-9 h-9 border border-ink/20 flex items-center justify-center text-ink/50 hover:border-ink hover:text-ink transition-colors font-mono text-sm"
          >
            □
          </button>
          {/* Dev mode terminal */}
          <Link
            href="#similar-vibes"
            className="w-9 h-9 border border-ink/20 flex items-center justify-center text-ink/50 hover:border-ink hover:text-ink transition-colors font-mono text-[10px]"
            title="Jump to ML Recommendations"
          >
            &gt;_
          </Link>
        </div>
      </header>

      {/* ══ Hero ════════════════════════════════════════════════════════════ */}
      <section className="grid grid-cols-1 lg:grid-cols-2 border-b border-ink/10">

        {/* Left — image / tile */}
        <div
          className={`relative flex items-center justify-center min-h-[380px] lg:min-h-[560px] border-b lg:border-b-0 lg:border-r border-ink/10 ${
            p.image_url ? "bg-cream-dim" : tileColor
          }`}
        >
          {/* Category badge */}
          <div className="absolute top-5 left-5 font-mono text-[9px] tracking-widest uppercase px-3 py-1.5 border border-current opacity-60">
            {catLabel}
          </div>
          {/* Bottom stamp */}
          <div className="absolute bottom-5 left-5 font-mono text-[8px] tracking-widest uppercase opacity-30">
            CRACKED · CAN · {p.abv ? `${p.abv}% VOL` : "—"}
          </div>

          {p.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={p.image_url}
              alt={p.name}
              className="object-contain max-h-[380px] w-auto mix-blend-multiply px-10"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-10">
              <p className="font-display text-4xl md:text-5xl text-current opacity-90 leading-tight">
                {p.name}
              </p>
            </div>
          )}
        </div>

        {/* Right — product info */}
        <div className="flex flex-col p-6 md:p-10 lg:p-12">

          {/* Brand pill */}
          <div className="mb-6">
            <span className="inline-block border border-vermilion/40 text-vermilion font-mono text-[10px] tracking-widest uppercase px-3 py-1.5">
              {brandName}
            </span>
          </div>

          {/* Product name */}
          <h1 className="font-display text-4xl md:text-5xl lg:text-6xl tracking-tight text-ink leading-[0.92] mb-6">
            {p.name}
          </h1>

          {/* Description */}
          <p className="font-sans text-sm text-ink/60 leading-relaxed italic mb-8 max-w-md">
            {description}
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 border-t border-ink/10 mb-8">
            <div className="py-4 pr-4 border-r border-ink/10">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1.5">Price</p>
              <p className="font-display-roman text-2xl text-ink">{price}</p>
            </div>
            <div className="py-4 px-4 border-r border-ink/10">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1.5">ABV</p>
              <p className="font-display-roman text-2xl text-ink">{p.abv ? `${p.abv}%` : "—"}</p>
            </div>
            <div className="py-4 pl-4">
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mb-1.5">Type</p>
              <span className={`inline-block font-mono text-[9px] tracking-widest uppercase px-2 py-1 ${tileColor}`}>
                {catLabel}
              </span>
            </div>
          </div>

          {/* ML vector card — only shows when ML API is running */}
          {similarity !== null && (
            <div className="bg-ink text-lime px-5 py-4 mb-8 font-mono">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest mb-2">
                <span className="text-lime/60">Vector Cosine Similarity:</span>
                <span className="font-bold text-lime">{similarity.toFixed(2)}</span>
              </div>
              {flavors.length > 0 && (
                <p className="text-[9px] text-lime/50 uppercase tracking-widest">
                  Tags: {flavors.join(", ")}
                </p>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="flex gap-3 mt-auto">
            <Link
              href="/browse"
              className="px-5 py-2.5 border border-ink/20 font-mono text-[10px] tracking-widest uppercase hover:border-ink transition-colors"
            >
              ← Back to Shelf
            </Link>
            <Link
              href={`/browse?category=${catKey}`}
              className="px-5 py-2.5 border border-ink/20 font-mono text-[10px] tracking-widest uppercase hover:border-ink transition-colors"
            >
              More {catLabel}s →
            </Link>
          </div>
        </div>
      </section>

      {/* ══ Main content ════════════════════════════════════════════════════ */}
      <div className="flex-1">

        {/* ── Drink Profile: Flavour + Taste Spectrum ─────────────────────── */}
        <section className="border-b border-ink/10 px-5 md:px-10 lg:px-16 py-12">
          <div className="max-w-screen-lg mx-auto space-y-8">
            <FlavorProfile name={p.name} category={catKey} />
            <TasteSpectrum name={p.name} category={catKey} abv={p.abv} />
          </div>
        </section>

        {/* ── Origin & Insights ───────────────────────────────────────────── */}
        <section className="border-b border-ink/10 px-5 md:px-10 lg:px-16 py-12">
          <div className="max-w-screen-lg mx-auto">
            <ProductInsights
              name={p.name}
              normalized_category={catKey}
              abv={p.abv}
              lcbo_id={p.lcbo_id}
              price_cents={p.price_cents}
            />
          </div>
        </section>

        {/* ── Community Reviews ────────────────────────────────────────────── */}
        <section className="border-b border-ink/10 px-5 md:px-10 lg:px-16 py-12">
          <div className="max-w-screen-lg mx-auto">
            <Suspense
              fallback={
                <div className="space-y-4 animate-pulse">
                  <div className="h-3 w-40 bg-ink/8 rounded" />
                  <div className="h-8 w-64 bg-ink/8 rounded" />
                  <div className="h-32 bg-ink/5 rounded" />
                </div>
              }
            >
              <CommunityRatings productId={product.id} />
            </Suspense>
          </div>
        </section>

        {/* ── Similar Vibes (ML Recommendations) ──────────────────────────── */}
        <section
          id="similar-vibes"
          className="px-5 md:px-10 lg:px-16 py-12"
        >
          <div className="max-w-screen-lg mx-auto">
            <Recommendations productId={product.id} />
          </div>
        </section>
      </div>

      {/* ══ Sticky bottom bar ════════════════════════════════════════════════ */}
      <footer className="sticky bottom-0 z-50 bg-cream border-t border-ink/10 flex items-center justify-between px-4 md:px-8 py-3 gap-4">
        <div className="min-w-0">
          <p className="font-display-roman text-2xl text-ink leading-none">{price}</p>
          <p className="font-mono text-[8px] uppercase tracking-widest text-ink/35 mt-1 truncate">
            Sold by LCBO&nbsp;/&nbsp;Local Ontario Corner-Store
          </p>
        </div>
        <AddToShelfButton productId={product.id} />
      </footer>
    </div>
  );
}
