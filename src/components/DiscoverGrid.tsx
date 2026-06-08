"use client";

/**
 * DiscoverGrid — Client Component
 * Receives all products from the server, handles client-side filtering.
 * Filters: sweetness_tier, abv range, flavor_tag
 */

import { useState, useMemo } from "react";
import type { DiscoverProduct } from "@/app/discover/page";
import Image from "next/image";

// ── Helpers ──────────────────────────────────────────────────

const SWEETNESS_LABELS: Record<string, string> = {
  low: "Dry",
  medium: "Off-Dry",
  high: "Sweet",
};

const SWEETNESS_COLOURS: Record<string, string> = {
  low: "bg-sky-100 text-sky-800",
  medium: "bg-amber-100 text-amber-800",
  high: "bg-pink-100 text-pink-800",
};

const TAG_COLOURS: Record<string, string> = {
  citrus: "bg-yellow-100 text-yellow-800",
  berry: "bg-purple-100 text-purple-800",
  tropical: "bg-orange-100 text-orange-800",
  "stone fruit": "bg-orange-100 text-orange-800",
  cherry: "bg-red-100 text-red-800",
  melon: "bg-green-100 text-green-800",
  apple: "bg-lime-100 text-lime-800",
  grape: "bg-violet-100 text-violet-800",
  tea: "bg-amber-100 text-amber-800",
  coffee: "bg-stone-200 text-stone-800",
  herbal: "bg-green-100 text-green-800",
  spiced: "bg-orange-100 text-orange-800",
  garden: "bg-emerald-100 text-emerald-800",
  clean: "bg-slate-100 text-slate-700",
  savoury: "bg-red-100 text-red-800",
  floral: "bg-pink-100 text-pink-800",
  vanilla: "bg-amber-50 text-amber-700",
  neutral: "bg-zinc-100 text-zinc-600",
};

function tagClass(tag: string): string {
  return TAG_COLOURS[tag] ?? "bg-zinc-100 text-zinc-600";
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Types ─────────────────────────────────────────────────────

interface Filters {
  sweetness: string; // "" | "low" | "medium" | "high"
  flavorTag: string; // "" or specific tag
  abvMin: number;
  abvMax: number;
}

const DEFAULT_FILTERS: Filters = {
  sweetness: "",
  flavorTag: "",
  abvMin: 0,
  abvMax: 45,  // accommodates spirit-based RTDs (up to 40% ABV)
};

// ── Component ─────────────────────────────────────────────────

export default function DiscoverGrid({ products }: { products: DiscoverProduct[] }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  // Collect all unique flavor tags across products
  const allTags = useMemo(() => {
    const seen = new Set<string>();
    for (const p of products) {
      for (const t of p.flavor_tags ?? []) seen.add(t);
    }
    return [...seen].sort();
  }, [products]);

  // Apply filters
  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (filters.sweetness && p.sweetness_tier !== filters.sweetness) return false;
      if (
        filters.flavorTag &&
        !(p.flavor_tags ?? []).includes(filters.flavorTag)
      )
        return false;
      const abv = p.abv ?? 0;
      if (abv < filters.abvMin || abv > filters.abvMax) return false;
      return true;
    });
  }, [products, filters]);

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === "abvMin") return v !== DEFAULT_FILTERS.abvMin;
    if (k === "abvMax") return v !== DEFAULT_FILTERS.abvMax;
    return v !== "";
  }).length;

  return (
    <div className="px-4 md:px-10 py-6">
      {/* ── Filters Bar ── */}
      <div className="flex flex-wrap gap-3 items-end mb-6 pb-4 border-b border-ink/8">
        {/* Sweetness */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            Sweetness
          </label>
          <div className="flex gap-1">
            {(["", "low", "medium", "high"] as const).map((v) => (
              <button
                key={v}
                onClick={() =>
                  setFilters((f) => ({ ...f, sweetness: f.sweetness === v ? "" : v }))
                }
                className={`px-3 py-1 rounded-full font-mono text-xs border transition-colors ${
                  filters.sweetness === v
                    ? "bg-ink text-cream border-ink"
                    : "bg-transparent text-ink/60 border-ink/20 hover:border-ink/50"
                }`}
              >
                {v === "" ? "Any" : SWEETNESS_LABELS[v]}
              </button>
            ))}
          </div>
        </div>

        {/* Flavor tag */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            Flavour
          </label>
          <select
            value={filters.flavorTag}
            onChange={(e) => setFilters((f) => ({ ...f, flavorTag: e.target.value }))}
            className="px-3 py-1 rounded-full font-mono text-xs bg-transparent border border-ink/20 text-ink/70 focus:outline-none focus:border-ink/50"
          >
            <option value="">Any flavour</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>

        {/* ABV range */}
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            ABV — {filters.abvMin}%–{filters.abvMax}%
          </label>
          <div className="flex gap-2 items-center">
            <input
              type="range"
              min={0}
              max={45}
              step={0.5}
              value={filters.abvMin}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  abvMin: Math.min(Number(e.target.value), f.abvMax),
                }))
              }
              className="w-20 accent-ink"
            />
            <span className="font-mono text-xs text-ink/40">to</span>
            <input
              type="range"
              min={0}
              max={45}
              step={0.5}
              value={filters.abvMax}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  abvMax: Math.max(Number(e.target.value), f.abvMin),
                }))
              }
              className="w-20 accent-ink"
            />
          </div>
        </div>

        {/* Clear */}
        {activeCount > 0 && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="self-end px-3 py-1 rounded-full font-mono text-xs border border-ink/30 text-ink/50 hover:text-ink hover:border-ink transition-colors"
          >
            Clear filters
          </button>
        )}

        <span className="self-end ml-auto font-mono text-xs text-ink/40">
          {filtered.length} of {products.length} shown
        </span>
      </div>

      {/* ── Product Grid ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center font-mono text-ink/40 text-sm">
          No products match — try adjusting the filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.sku} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Product Card ──────────────────────────────────────────────

function ProductCard({ product: p }: { product: DiscoverProduct }) {
  const [imgErr, setImgErr] = useState(false);
  const tier = p.sweetness_tier ?? "medium";

  return (
    <article className="flex flex-col rounded-xl overflow-hidden border border-ink/8 bg-white/60 hover:border-ink/30 hover:shadow-sm transition-all group">
      {/* Image */}
      <div className="relative w-full aspect-square bg-cream-dim flex items-center justify-center overflow-hidden">
        {p.image_url && !imgErr ? (
          <Image
            src={p.image_url}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 17vw"
            className="object-contain p-4"
            onError={() => setImgErr(true)}
            loading="lazy"
          />
        ) : (
          <span className="font-mono text-[10px] text-ink/30 text-center px-2">
            {p.name}
          </span>
        )}
        {/* Sweetness badge */}
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full font-mono text-[9px] uppercase tracking-wide ${SWEETNESS_COLOURS[tier] ?? ""}`}
        >
          {SWEETNESS_LABELS[tier] ?? tier}
        </span>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 gap-1.5 p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 truncate">
          {p.producer ?? "LCBO"}
        </p>
        <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-ink">
          {p.name}
        </p>

        {/* Price + ABV */}
        <div className="flex items-baseline gap-2 mt-auto pt-1">
          <span className="font-mono text-sm font-bold">{formatPrice(p.price_cents)}</span>
          {p.abv != null && (
            <span className="font-mono text-[10px] text-ink/50">{p.abv}% abv</span>
          )}
          {p.volume_ml != null && (
            <span className="font-mono text-[10px] text-ink/40">{p.volume_ml}mL</span>
          )}
        </div>

        {/* Nutrition estimates — always labelled "est." */}
        {(p.kcal_estimate != null || p.sugar_estimate_g != null) && p.is_estimated && (
          <div className="flex gap-2 mt-0.5">
            {p.kcal_estimate != null && (
              <span className="font-mono text-[9px] text-ink/40">
                ~{p.kcal_estimate} kcal <span className="text-ink/25">est.</span>
              </span>
            )}
            {p.sugar_estimate_g != null && (
              <span className="font-mono text-[9px] text-ink/40">
                ~{p.sugar_estimate_g}g sugar <span className="text-ink/25">est.</span>
              </span>
            )}
          </div>
        )}

        {/* Flavor tags */}
        {(p.flavor_tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {(p.flavor_tags ?? []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={`px-1.5 py-0.5 rounded-full font-mono text-[8px] uppercase tracking-wide ${tagClass(tag)}`}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
