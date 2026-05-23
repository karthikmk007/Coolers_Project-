"use client";

import { useState } from "react";

interface ProductImageProps {
  src: string;
  alt: string;
  label: string;
  accent: string;
  /** Colored tile shown when image fails to load */
  fallbackBg: string;
  fallbackText: string;
  fallbackStamp: string;
}

/**
 * Client component — shows the LCBO product image with a
 * mix-blend-multiply effect. Falls back to the category-colored
 * tile if the CDN returns a 404 or the image fails to load.
 */
export function ProductImage({
  src,
  alt,
  label,
  accent,
  fallbackBg,
  fallbackText,
  fallbackStamp,
}: ProductImageProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    /* ── Colored tile fallback ─────────────────────────────── */
    return (
      <div
        className={`aspect-[3/4] flex flex-col justify-between p-5 ${fallbackBg}`}
      >
        <span
          className={`font-mono text-[10px] tracking-widest uppercase ${fallbackText} opacity-80`}
        >
          {label}
        </span>
        <div>
          <p
            className={`font-display text-xl leading-tight ${fallbackText} mb-3 line-clamp-4`}
          >
            {alt}
          </p>
          <p
            className={`font-mono text-[9px] tracking-widest uppercase ${fallbackStamp}`}
          >
            CRACKED · CA
          </p>
        </div>
      </div>
    );
  }

  /* ── Real product image ──────────────────────────────────── */
  return (
    <div className="aspect-[3/4] relative overflow-hidden bg-cream-dim group-hover:bg-cream transition-colors duration-300">
      {/* Category label + watermark */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 py-3 z-10">
        <span
          className={`font-mono text-[10px] tracking-widest uppercase px-2 py-0.5 ${accent}`}
        >
          {label}
        </span>
        <span className="font-mono text-[9px] tracking-widest uppercase text-ink/20">
          CRACKED · CA
        </span>
      </div>

      {/* Product photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setErrored(true)}
        className="absolute inset-0 w-full h-full object-contain p-8 mix-blend-multiply group-hover:scale-105 transition-transform duration-500 ease-out"
      />
    </div>
  );
}
