"use client";

import { useState } from "react";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

const TILE: Record<string, { bg: string; text: string; label: string; stamp: string }> = {
  hard_seltzer: { bg: "bg-lime",      text: "text-ink",   label: "SELTZER", stamp: "text-ink/25"   },
  cooler:       { bg: "bg-vermilion", text: "text-cream", label: "COOLER",  stamp: "text-cream/25" },
  cider:        { bg: "bg-amber",     text: "text-cream", label: "CIDER",   stamp: "text-cream/25" },
  radler:       { bg: "bg-lime-dim",  text: "text-ink",   label: "RADLER",  stamp: "text-ink/25"   },
  other:        { bg: "bg-ink",       text: "text-cream", label: "RTD",     stamp: "text-cream/25" },
};

function cleanName(n: string) {
  return n.replace(/\s+\d+\s*m[lL]/g, "").replace(/\s+\d+\s*pack/gi, "").trim();
}

export function ProductTile({
  product,
  selected,
  onClick,
}: {
  product: Product;
  selected: boolean;
  onClick: () => void;
}) {
  const [imgErr, setImgErr] = useState(false);
  const tile  = TILE[product.normalized_category] ?? TILE.other;
  const brand = product.brand?.name ?? "—";
  const price = product.price_cents ? `$${(product.price_cents / 100).toFixed(2)}` : "—";
  const name  = cleanName(product.name);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 w-[175px] text-left transition-all duration-200 group ${
        selected
          ? "opacity-100 scale-[1.03]"
          : "opacity-55 hover:opacity-80 hover:scale-[1.01]"
      }`}
    >
      {/* ── Tile: neutral bg when image present, colored when text fallback ── */}
      <div
        className={`relative w-full h-[232px] overflow-hidden ${
          product.image_url && !imgErr ? "bg-[#1A1C14]" : tile.bg
        }`}
      >

        {/* Category badge — top left */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`font-mono text-[7px] uppercase tracking-widest ${tile.text} opacity-70`}>
            {tile.label}
          </span>
        </div>

        {/* ABV badge — top right */}
        {product.abv != null && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <span className="bg-black/55 text-white font-mono text-[7px] px-1.5 py-0.5 leading-none">
              {product.abv}% ABV
            </span>
          </div>
        )}

        {/* Product image (DO NOT MODIFY image src/loading/error logic) */}
        {product.image_url && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={name}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-contain p-5"
          />
        ) : (
          /* Text fallback — shown when no image or image fails */
          <div className="absolute inset-0 flex items-end p-4">
            <p className={`font-display italic text-lg leading-snug ${tile.text} line-clamp-4`}>
              {name}
            </p>
          </div>
        )}

        {/* CRACKED · CA stamp — bottom left */}
        <div className="absolute bottom-2.5 left-3 z-10">
          <span className={`font-mono text-[6px] uppercase tracking-widest ${tile.stamp}`}>
            CRACKED · CA
          </span>
        </div>

        {/* Selected indicator — white bottom border */}
        {selected && (
          <div className="absolute bottom-0 inset-x-0 h-[3px] bg-white" />
        )}
      </div>

      {/* ── Below-tile meta ── */}
      <div className="mt-2.5 space-y-[3px]">
        <p className="font-mono text-[8px] uppercase tracking-wide text-white leading-snug line-clamp-2">
          {product.name}
        </p>
        <p className="font-mono text-[7px] uppercase tracking-widest text-white/35">
          {brand}
        </p>
        <div className="flex items-center justify-between mt-1">
          {product.abv != null && (
            <span className="font-mono text-[8px] text-white/45">{product.abv}% ABV</span>
          )}
          <span className="font-mono text-[8px] text-white/65 ml-auto">{price}</span>
        </div>
      </div>
    </button>
  );
}
