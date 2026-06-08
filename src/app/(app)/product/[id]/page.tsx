/**
 * CRACKED — Product Detail Page
 * All 10 sections per master spec.
 */

import { notFound }          from "next/navigation";
import Link                  from "next/link";
import Image                 from "next/image";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ScoreCircle }       from "@/components/product/ScoreCircle";
import { TasteSliders }      from "@/components/product/TasteSliders";
import { CrowdNotes }                  from "@/components/product/CrowdNotes";
import { notesFromFlavors }            from "@/lib/utils/crowd-notes";
import { RatingHistogram }   from "@/components/product/RatingHistogram";
import { ReviewFeed }        from "@/components/product/ReviewFeed";
import { SimilarCarousel }   from "@/components/product/SimilarCarousel";
import { ProductActions }    from "./ProductActions";
import { formatPrice, formatAbv } from "@/lib/utils/format";
import { scoreColor }        from "@/lib/utils/score";
import { MapPin, Beaker, Percent, Clock, Tag } from "lucide-react";

export const revalidate = 300;

// ── Metadata ──────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select("name, brand, description")
    .eq("id", id)
    .single();

  if (!data) return { title: "Product — CRACKED" };
  return {
    title:       `${data.name} — CRACKED`,
    description: data.description ?? `${data.brand} ${data.name} — rate and discover at CRACKED.`,
  };
}

// ── Page ──────────────────────────────────────────────────────
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }   = await params;
  const supabase = await createSupabaseServerClient();

  const { data: product, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !product) notFound();

  // ── Fetch stats (avg_score, counts) ─────────────────────────
  const { data: statsRows } = await supabase
    .from("ratings")
    .select("score")
    .eq("product_id", id);

  const scores   = (statsRows ?? []).map((r) => r.score);
  const total    = scores.length;
  const avgScore = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
  const counts   = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number>;
  scores.forEach((s) => {
    const bucket = Math.min(5, Math.max(1, Math.round(s)));
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  });

  const color      = scoreColor(avgScore);
  const heroImg    = product.image_url ?? product.thumbnail_url;
  const crowdNotes = notesFromFlavors(product.flavor_notes ?? []);

  return (
    <div className="min-h-screen bg-cracked-cream pb-32">

      {/* ═══ S1: STICKY HERO ════════════════════════════════════ */}
      <div className="relative">
        {/* Full-bleed image */}
        <div className="relative w-full h-[300px] bg-cracked-dark overflow-hidden">
          {heroImg ? (
            <Image
              src={heroImg}
              alt={product.name}
              fill
              className="object-contain p-8"
              priority
              sizes="100vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-white/20 text-center px-8 leading-tight"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
              >
                {product.name}
              </span>
            </div>
          )}
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cracked-cream to-transparent" />

          {/* Floating ScoreCircle */}
          {avgScore > 0 && (
            <div className="absolute bottom-4 right-4">
              <ScoreCircle score={avgScore} size="lg" />
            </div>
          )}
        </div>

        {/* Brand + Name */}
        <div className="px-4 pt-2 pb-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]"
                 style={{ color }}>
                {product.brand}
              </p>
              <h1
                className="text-cracked-dark leading-tight mt-0.5"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 32 }}
              >
                {product.name}
              </h1>
              {product.style && (
                <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-widest bg-cracked-dark text-cracked-cream px-2.5 py-1 rounded-lg font-[family-name:var(--font-dm-sans)]">
                  {product.style}
                </span>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1 pt-1">
              <span
                className="font-bold"
                style={{ fontFamily: "var(--font-jetbrains)", fontSize: 22, color: "#F97316" }}
              >
                {formatPrice(product.price)}
              </span>
              {product.abv && (
                <span className="text-[11px] text-cracked-muted font-[family-name:var(--font-jetbrains)]">
                  {formatAbv(product.abv)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ S2: QUICK ACTIONS ══════════════════════════════════ */}
      <ProductActions productId={id} style={product.style} />

      {/* ═══ S3: INTEL GRID ═════════════════════════════════════ */}
      <section className="px-4 mt-5">
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              Icon: MapPin,
              label: "Origin",
              value: product.region ?? product.country ?? "Ontario, CA",
            },
            {
              Icon: Beaker,
              label: "Style",
              value: product.style ?? "Cooler",
            },
            {
              Icon: Percent,
              label: "ABV",
              value: product.abv ? `${product.abv}%` : "—",
            },
            {
              Icon: Clock,
              label: "Best Window",
              value: (product.abv ?? 5) < 6 ? "Summer patio" : "Year-round",
            },
          ].map(({ Icon, label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-3 border border-neutral-100">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-cracked-orange" strokeWidth={2} />
                <p className="text-[10px] uppercase tracking-widest text-cracked-muted font-[family-name:var(--font-dm-sans)]">
                  {label}
                </p>
              </div>
              <p className="text-sm font-bold text-cracked-dark font-[family-name:var(--font-dm-sans)]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ S4: CROWD NOTES ════════════════════════════════════ */}
      {crowdNotes.length > 0 && (
        <section className="mt-8">
          <CrowdNotes notes={crowdNotes} />
        </section>
      )}

      {/* ═══ S5: TASTE PROFILE ══════════════════════════════════ */}
      <section className="px-4 mt-8 bg-white rounded-2xl mx-4 p-5 border border-neutral-100">
        <TasteSliders
          sweet={product.taste_sweet}
          bold={product.taste_bold}
          carb={product.taste_carb}
          editable={false}
        />
      </section>

      {/* ═══ S6: PAIRS GREAT WITH ═══════════════════════════════ */}
      {(product.pairs_with ?? []).length > 0 && (
        <section className="px-4 mt-8">
          <h3
            className="text-cracked-dark mb-3"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 22 }}
          >
            Pairs Great With
          </h3>
          <div className="flex flex-wrap gap-2">
            {product.pairs_with.map((p: string) => (
              <span
                key={p}
                className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-full px-3 py-1.5 text-xs font-medium text-cracked-dark font-[family-name:var(--font-dm-sans)]"
              >
                <Tag className="w-3 h-3 text-cracked-orange" />
                {p}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* ═══ S7: COMMUNITY RATINGS ══════════════════════════════ */}
      <section className="px-4 mt-8 bg-white rounded-2xl mx-4 p-5 border border-neutral-100">
        <h3
          className="text-cracked-dark mb-4"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 22 }}
        >
          Community Ratings
        </h3>
        {total > 0 ? (
          <RatingHistogram
            counts={counts as { 1: number; 2: number; 3: number; 4: number; 5: number }}
            total={total}
            avgScore={+avgScore.toFixed(1)}
          />
        ) : (
          <p className="text-sm text-cracked-muted text-center py-4 font-[family-name:var(--font-dm-sans)]">
            No ratings yet — crack this one open first 🍺
          </p>
        )}
      </section>

      {/* ═══ S8: REVIEWS ════════════════════════════════════════ */}
      <section className="mt-8">
        <ReviewFeed productId={id} limit={3} />
      </section>

      {/* ═══ S9: THE NEXT ROUND ═════════════════════════════════ */}
      <section className="mt-10">
        <SimilarCarousel productId={id} style={product.style} limit={8} />
      </section>

      {/* ═══ S10: VAULT UPSELL ══════════════════════════════════ */}
      <section className="mx-4 mt-10 rounded-2xl overflow-hidden bg-cracked-dark p-6">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-cracked-orange font-[family-name:var(--font-dm-sans)]">
              🔒 CRACKED VAULT
            </span>
            <h4
              className="text-white mt-1 leading-tight"
              style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 26 }}
            >
              Unlock the full flavour deep-dive
            </h4>
            <p className="text-white/50 text-xs mt-2 font-[family-name:var(--font-dm-sans)] max-w-xs">
              Pro members get taste predictions, price alerts, and exclusive Ontario drop notifications.
            </p>
          </div>
        </div>
        <button className="mt-5 w-full py-3.5 bg-cracked-orange text-white font-bold uppercase tracking-widest text-sm rounded-xl font-[family-name:var(--font-dm-sans)]">
          Go Pro — Free 7-Day Trial →
        </button>
      </section>

      {/* Bottom back button */}
      <div className="px-4 mt-8">
        <Link
          href="/shop"
          className="flex items-center gap-2 text-cracked-muted text-sm font-[family-name:var(--font-dm-sans)]"
        >
          ← Back to Shop
        </Link>
      </div>
    </div>
  );
}
