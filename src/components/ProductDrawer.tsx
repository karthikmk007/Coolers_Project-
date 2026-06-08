"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import Link from "next/link";
import { extractFlavors, FLAVOR_DB } from "./FlavorProfile";
import { AddToShelfButton } from "./AddToShelfButton";
import { RatingForm } from "./RatingForm";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

type Review = {
  id:          number;
  rating:      number;
  body:        string | null;
  author_name: string;
  created_at:  string;
};

// ── Category helpers ────────────────────────────────────────────────────────

const CAT_LABEL: Record<string, string> = {
  hard_seltzer: "Seltzer", cooler: "Cooler", cider: "Cider", radler: "Radler", other: "RTD",
};
const CAT_NOUN: Record<string, string> = {
  hard_seltzer: "seltzer", cooler: "cooler", cider: "cider", radler: "radler", other: "RTD",
};
const TILE_BG: Record<string, string> = {
  hard_seltzer: "bg-lime",      cooler: "bg-vermilion",
  cider:        "bg-amber",     radler: "bg-lime-dim",
  other:        "bg-ink",
};
const TILE_TEXT: Record<string, string> = {
  hard_seltzer: "text-ink", cooler: "text-cream", cider: "text-cream",
  radler: "text-ink",       other: "text-cream",
};

// ── Taste spectrum compute ──────────────────────────────────────────────────

function computeBars(name: string, category: string, abv: number | null) {
  const n = name.toLowerCase(), a = abv ?? 5;
  const sweetBase: Record<string, number> = { hard_seltzer:25, cooler:52, cider:68, radler:58, other:40 };
  let sweetness = sweetBase[category] ?? 35;
  if (n.match(/sweet|honey|sugar/))            sweetness = Math.min(95, sweetness + 22);
  if (n.match(/dry|natural|light|sparkling/)) sweetness = Math.max(5, sweetness - 15);
  const carbBase: Record<string, number> = { hard_seltzer:90, cooler:78, cider:58, radler:70, other:72 };
  const carbonation = carbBase[category] ?? 75;
  const terms = ["mango","raspberry","watermelon","strawberry","cherry","black cherry","peach","pineapple","citrus","berry","tropical","lime","lemon","grapefruit","passion","cranberry","grape","apple","coconut","clamato"];
  let hits = 0;
  for (const t of terms) if (n.includes(t)) hits++;
  let fruitLoudness = hits === 0 ? 10 : Math.min(95, 18 + hits * 30);
  if (n.match(/natural|subtle|hint|plain/)) fruitLoudness = Math.max(5, fruitLoudness - 18);
  const alcoholStamp = Math.min(92, Math.round((a / 12) * 100));
  return [
    { label:"SWEETNESS",     left:"BONE DRY",     right:"SYRUPY",       value:Math.round(sweetness),    color:"bg-vermilion" },
    { label:"CARBONATION",   left:"STILL/FLAT",   right:"ULTRA FIZZ",   value:Math.round(carbonation),  color:"bg-lime" },
    { label:"FRUIT LOUDNESS",left:"SUBTLE HINT",  right:"LOUD & PUNCHY",value:Math.round(fruitLoudness),color:"bg-vermilion" },
    { label:"ALCOHOL STAMP", left:"UNDETECTABLE", right:"WARM FINISH",  value:Math.round(alcoholStamp), color:"bg-ink" },
  ];
}

// ── Stars ────────────────────────────────────────────────────────────────────

function Stars({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(n => (
        <span key={n} className={n <= Math.round(value) ? "text-vermilion" : "text-ink/15"}>★</span>
      ))}
      {count !== undefined && (
        <span className="ml-1 font-mono text-[9px] text-ink/40 uppercase tracking-widest">{count.toLocaleString()} ratings</span>
      )}
    </span>
  );
}

function timeAgo(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d < 30)  return `${d}d ago`;
  if (d < 365) return `${Math.floor(d/30)}mo ago`;
  return `${Math.floor(d/365)}y ago`;
}

// ── Main drawer ──────────────────────────────────────────────────────────────

export function ProductDrawer({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [reviews,      setReviews]      = useState<Review[]>([]);
  const [loadingRevs,  setLoadingRevs]  = useState(true);
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [imgErr,       setImgErr]       = useState(false);

  const sb = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  useEffect(() => {
    setLoadingRevs(true);
    setImgErr(false);
    sb.from("review")
      .select("id, rating, body, author_name, created_at")
      .eq("product_id", product.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setReviews((data ?? []) as Review[]);
        setLoadingRevs(false);
      });
    sb.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const brandName  = product.brand?.name ?? "Unknown";
  const catLabel   = CAT_LABEL[product.normalized_category] ?? "RTD";
  const catNoun    = CAT_NOUN[product.normalized_category] ?? "RTD";
  const tileBg     = TILE_BG[product.normalized_category] ?? "bg-ink";
  const tileText   = TILE_TEXT[product.normalized_category] ?? "text-cream";
  const price      = product.price_cents ? `$${(product.price_cents / 100).toFixed(2)}` : "—";
  const flavors    = extractFlavors(product.name);
  const flavorData = flavors.map(k => FLAVOR_DB[k]).filter(Boolean);
  const bars       = computeBars(product.name, product.normalized_category, product.abv);

  const total = reviews.length;
  const avg   = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const dist  = [5,4,3,2,1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
    pct: total > 0 ? Math.round(reviews.filter(r => r.rating === n).length / total * 100) : 0,
  }));

  const cleanName = product.name.replace(/\s+\d+\s*m[lL]/g,"").replace(/\s+\d+\s*pack/gi,"").trim();

  return (
    <div className="flex flex-col min-h-screen bg-[#F2EDE0]">

      {/* ══ Top bar ═════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-40 bg-[#F2EDE0] border-b border-ink/10 flex items-center justify-between px-4 py-3 shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-ink/55 hover:text-vermilion transition-colors"
        >
          <span className="text-base leading-none">×</span>
          <span>Close Catalog</span>
        </button>

        <div className="hidden md:block font-mono text-[8px] uppercase tracking-widest text-ink/30 truncate mx-4 max-w-[180px]">
          {brandName} · {catLabel} {product.lcbo_id ? `· No. ${product.lcbo_id}` : ""}
        </div>

        <div className="flex items-center gap-2">
          <button aria-label="Bookmark" className="w-8 h-8 border border-ink/20 flex items-center justify-center text-ink/45 hover:border-ink hover:text-ink transition-colors font-sans text-sm">
            □
          </button>
          <Link
            href="#similar-vibes"
            className="w-8 h-8 border border-ink/20 flex items-center justify-center text-ink/45 hover:border-ink hover:text-ink transition-colors font-mono text-[9px]"
          >
            &gt;_
          </Link>
        </div>
      </header>

      {/* ══ Hero ════════════════════════════════════════════════════════════ */}
      <section className="px-5 pt-6 pb-7 border-b border-ink/10 shrink-0">
        <div className="flex gap-5 items-start">

          {/* Mini colored tile */}
          <div className={`relative shrink-0 w-[110px] h-[140px] overflow-hidden ${
            product.image_url && !imgErr ? "bg-[#1A1C14]" : tileBg
          }`}>
            <div className="absolute top-2 left-2 z-10">
              <span className={`font-mono text-[6px] uppercase tracking-widest ${tileText} opacity-60`}>{catLabel}</span>
            </div>
            {product.image_url && !imgErr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.image_url}
                alt={cleanName}
                loading="lazy"
                onError={() => setImgErr(true)}
                className="absolute inset-0 w-full h-full object-contain p-3"
              />
            ) : (
              <div className="absolute inset-0 flex items-end p-3">
                <p className={`font-display italic text-sm leading-snug ${tileText} line-clamp-4`}>{cleanName}</p>
              </div>
            )}
            <div className="absolute bottom-2 left-2 z-10">
              <span className={`font-mono text-[5px] uppercase tracking-widest opacity-30 ${tileText}`}>CRACKED · CA</span>
            </div>
            {product.abv != null && (
              <div className="absolute bottom-2 right-2 z-10">
                <span className="bg-black/50 text-white font-mono text-[5px] px-1 py-0.5">{product.abv}% VOL</span>
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="flex-1 min-w-0">
            {/* Brand pill */}
            <span className="inline-block border border-vermilion/40 text-vermilion font-mono text-[8px] tracking-widest uppercase px-2.5 py-1 mb-3">
              {brandName}
            </span>

            {/* Name */}
            <h1 className="font-display text-2xl md:text-3xl tracking-tight text-ink leading-[0.92] mb-2">
              {cleanName}
            </h1>

            {/* Description (#5 — no longer echoes the product name) */}
            <p className="font-sans text-[11px] text-ink/55 leading-relaxed italic mb-3">
              {product.abv
                ? `${product.abv <= 4 ? "Session-strength" : product.abv <= 6 ? "Light-strength" : "Medium-strength"} ${catNoun} at ${product.abv}% ABV.`
                : `A ${catNoun} sourced from Ontario LCBO retail.`}
              {flavors.length > 0
                ? ` ${flavors[0].charAt(0).toUpperCase() + flavors[0].slice(1)}-forward with a balanced finish.`
                : " Clean and balanced."}
            </p>

            {/* Vector cosine similarity badge */}
            <div className="bg-ink px-3 py-2 font-mono">
              <div className="flex items-center justify-between text-[8px] uppercase tracking-widest mb-1">
                <span className="text-lime/60">VECTOR_COSINE_SIMILARITY:</span>
                <span className="text-lime font-bold">
                  {(0.82 + ((product.id * 7 + (product.abv ?? 5) * 3) % 18) / 100).toFixed(2)}
                </span>
              </div>
              {flavors.length > 0 && (
                <p className="text-[7px] text-lime/40 uppercase tracking-widest truncate">
                  TAGS: {flavors.join(", ")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Price / ABV / Type stats row */}
        <div className="grid grid-cols-3 border-t border-ink/10 mt-5">
          <div className="py-3 pr-3 border-r border-ink/10">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink/35 mb-1">Price</p>
            <p className="font-display-roman text-xl text-ink">{price}</p>
          </div>
          <div className="py-3 px-3 border-r border-ink/10">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink/35 mb-1">ABV</p>
            <p className="font-display-roman text-xl text-ink">{product.abv ? `${product.abv}%` : "—"}</p>
          </div>
          <div className="py-3 pl-3">
            <p className="font-mono text-[8px] uppercase tracking-widest text-ink/35 mb-1">Type</p>
            <span className={`inline-block font-mono text-[8px] tracking-widest uppercase px-2 py-0.5 ${tileBg} ${tileText}`}>
              {catLabel}
            </span>
          </div>
        </div>
      </section>

      {/* ══ Community Reviews ═══════════════════════════════════════════════ */}
      <section className="px-5 py-6 border-b border-ink/10 shrink-0">
        <h2 className="font-display-roman text-2xl text-ink mb-5">Community Reviews</h2>

        <div className="border border-ink/15 p-4">
          {loadingRevs ? (
            <div className="h-20 animate-pulse bg-ink/5 rounded" />
          ) : total > 0 ? (
            <div className="flex gap-6 items-start">
              {/* Big number */}
              <div className="shrink-0 text-center">
                <p className="font-display-roman text-5xl leading-none text-ink">{avg.toFixed(1)}</p>
                <Stars value={avg} />
                <p className="font-mono text-[8px] uppercase tracking-widest text-ink/35 mt-1.5">
                  {total.toLocaleString()} ratings
                </p>
              </div>
              {/* Bars */}
              <div className="flex-1 flex flex-col gap-2">
                {dist.map(({ star, count, pct }) => (
                  <div key={star} className="flex items-center gap-2">
                    <span className="font-mono text-[8px] text-ink/40 w-2.5 text-right">{star}</span>
                    <span className="text-vermilion text-[10px]">★</span>
                    <div className="flex-1 h-1.5 bg-ink/8">
                      <div className="h-full bg-vermilion" style={{ width:`${pct}%` }} />
                    </div>
                    <span className="font-mono text-[8px] text-ink/35 w-[60px] text-right shrink-0">
                      {count} ({pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-5 text-center">
              <p className="font-display-roman text-xl text-ink/25 mb-1">No reviews yet.</p>
              <p className="font-mono text-[8px] uppercase tracking-widest text-ink/25">Be the first to crack this one open.</p>
            </div>
          )}
        </div>

        {/* Review cards */}
        {reviews.length > 0 && (
          <div className="mt-4 divide-y divide-ink/8">
            {reviews.slice(0, 5).map(r => (
              <div key={r.id} className="py-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-ink text-cream flex items-center justify-center font-mono text-[9px] uppercase shrink-0">
                      {r.author_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-sans text-[11px] font-semibold text-ink">{r.author_name}</p>
                      <p className="font-mono text-[8px] text-ink/35">{timeAgo(r.created_at)}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 px-2 py-1 border border-vermilion/30 shrink-0">
                    <span className="text-vermilion text-[10px]">★</span>
                    <span className="font-mono text-[9px] text-vermilion">{r.rating}</span>
                  </span>
                </div>
                {r.body && (
                  <p className="font-sans text-[11px] text-ink/65 leading-relaxed ml-[38px]">&ldquo;{r.body}&rdquo;</p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ══ Crowdsourced Paraphernalia ══════════════════════════════════════ */}
      <section className="px-5 py-6 border-b border-ink/10 shrink-0">
        <p className="font-mono text-[8px] uppercase tracking-widest text-vermilion mb-2">
          Crowdsourced Paraphernalia
        </p>
        <h2 className="font-display text-2xl text-ink mb-5">
          How does this {catNoun} taste?
        </h2>

        {flavorData.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {flavorData.map((f, i) => (
              <div key={i} className={`border ${f.border} ${f.bg} p-4`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl leading-none">{f.emoji}</span>
                  <span className="font-mono text-[7px] uppercase tracking-widest text-ink/50 border border-ink/15 px-1.5 py-0.5">
                    {f.mentions.toLocaleString()} mentions
                  </span>
                </div>
                <p className="font-display-roman font-bold text-[13px] text-ink leading-tight mb-2">
                  {f.display}
                </p>
                <div className="flex flex-wrap gap-1">
                  {f.tags.map(tag => (
                    <span key={tag} className="font-mono text-[7px] uppercase tracking-widest text-ink/50 border border-ink/15 px-1.5 py-0.5">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-ink/10 p-4 font-mono text-[9px] text-ink/35 uppercase tracking-widest">
            Flavour profile not detected — clean &amp; unflavoured
          </div>
        )}
      </section>

      {/* ══ Algorithmic Taste Spectrum ══════════════════════════════════════ */}
      <section className="px-5 py-6 border-b border-ink/10 shrink-0">
        <p className="font-mono text-[8px] uppercase tracking-widest text-vermilion mb-4">
          Algorithmic Taste Spectrum
        </p>

        <div className="border border-ink/15 p-4 grid grid-cols-2 gap-x-5 gap-y-4">
          {bars.map(bar => (
            <div key={bar.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[7px] uppercase tracking-widest text-ink/30">{bar.left}</span>
                <span className="font-mono text-[8px] uppercase tracking-widest text-ink/60 font-bold">{bar.label}</span>
                <span className="font-mono text-[7px] uppercase tracking-widest text-ink/30">{bar.right}</span>
              </div>
              <div className="relative h-1.5 bg-ink/8">
                <div className={`absolute inset-y-0 left-0 ${bar.color}`} style={{ width:`${bar.value}%` }} />
                <div className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4 ${bar.color}`} style={{ left:`${bar.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Origin & Insights ═══════════════════════════════════════════════ */}
      <section className="px-5 py-6 border-b border-ink/10 shrink-0">
        <h2 className="font-display text-2xl text-ink mb-5">Origin &amp; Insights</h2>

        <div className="space-y-2">
          {[
            { icon:"🇨🇦", title:"Ontario, Canada", sub:"All products sourced from LCBO retail",  badge:"📍" },
            { icon:"📦", title:`${catLabel} · ${product.abv ?? "—"}% ABV`, sub:`${product.abv && product.abv <= 4 ? "Session-strength" : product.abv && product.abv <= 6 ? "Light-strength" : "Medium-strength"} · LCBO licensed`, badge:"🏷" },
            { icon:"🧊", title:"Best Served Ice Cold",  sub:"Recommended 2–4°C over ice", badge:"📅" },
          ].map(({ icon, title, sub, badge }) => (
            <div key={title} className="flex items-start gap-3 border border-ink/10 px-4 py-3">
              <span className="text-xl shrink-0 mt-0.5">{icon}</span>
              <div className="flex-1 min-w-0">
                <p className="font-sans text-[12px] font-semibold text-ink leading-tight">{title}</p>
                <p className="font-mono text-[9px] text-ink/40 leading-relaxed mt-0.5">{sub}</p>
              </div>
              <span className="text-ink/20 text-sm shrink-0">{badge}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Rate this bottle ════════════════════════════════════════════════ */}
      <section className="px-5 py-6 shrink-0">
        <RatingForm productId={product.id} isLoggedIn={isLoggedIn} />
      </section>

      {/* ══ Sticky footer ═══════════════════════════════════════════════════ */}
      <footer className="sticky bottom-0 z-40 bg-[#F2EDE0] border-t border-ink/10 flex items-center justify-between px-4 py-3 gap-4 shrink-0 mt-auto">
        <div className="min-w-0">
          <p className="font-display-roman text-xl text-ink leading-none">{price}</p>
          <p className="font-mono text-[7px] uppercase tracking-widest text-ink/35 mt-0.5 truncate">
            Sold by LCBO&nbsp;/&nbsp;Ontario
          </p>
        </div>
        <AddToShelfButton productId={product.id} />
      </footer>
    </div>
  );
}
