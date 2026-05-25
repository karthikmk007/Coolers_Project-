"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "";

const CATEGORY_ACCENT: Record<string, string> = {
  hard_seltzer: "text-lime",
  cooler:        "text-vermilion",
  cider:         "text-amber",
  radler:        "text-lime-dim",
  other:         "text-ink/40",
};

const CATEGORY_TILE: Record<string, { bg: string; text: string; label: string }> = {
  hard_seltzer: { bg: "bg-lime",     text: "text-ink",   label: "Seltzer" },
  cooler:        { bg: "bg-vermilion", text: "text-cream", label: "Cooler"  },
  cider:         { bg: "bg-amber",   text: "text-cream", label: "Cider"   },
  radler:        { bg: "bg-lime-dim", text: "text-ink",  label: "Radler"  },
  other:         { bg: "bg-ink",     text: "text-cream", label: "RTD"     },
};

type Rec = {
  id: number;
  name: string;
  brand_name: string;
  normalized_category: string;
  abv: number | null;
  price_cents: number | null;
  image_url: string | null;
  similarity: number;
};

export function Recommendations({ productId }: { productId: number }) {
  const [recs, setRecs]         = useState<Rec[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [devMode, setDevMode]   = useState(false);

  useEffect(() => {
    if (!ML_API_URL) {
      setError("no_api");
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();

    fetch(`${ML_API_URL}/recommend`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ product_id: productId, limit: 4, threshold: 0.3 }),
      signal:  ctrl.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setRecs(d.results || []))
      .catch(() => { if (!ctrl.signal.aborted) setError("fetch_failed"); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

    return () => ctrl.abort();
  }, [productId]);

  /* ── Offline banner ──────────────────────────────────────────── */
  if (error === "no_api") {
    return (
      <div className="border border-ink/10 p-6 relative">
        <div className="absolute -top-3 left-4 bg-ink text-lime px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
          ML Layer · Offline
        </div>
        <p className="font-mono text-xs text-ink/40 leading-relaxed">
          Set{" "}
          <code className="text-vermilion">NEXT_PUBLIC_ML_API_URL=http://localhost:8000</code>{" "}
          in <code className="text-vermilion">.env.local</code> and start the FastAPI server.
        </p>
        <p className="font-mono text-[10px] text-ink/25 mt-2">
          python3 -m uvicorn api.main:app --port 8000
        </p>
      </div>
    );
  }

  if (error === "fetch_failed") {
    return (
      <div className="border border-vermilion/20 bg-vermilion/5 p-6 font-mono text-xs text-vermilion">
        Could not reach recommendation engine at{" "}
        <code>{ML_API_URL}</code>. Is the FastAPI server running?
      </div>
    );
  }

  /* ── Loading skeleton ────────────────────────────────────────── */
  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
            Section 04 — Similar Vibes
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {[0, 1, 2, 3].map((i) => (
            <div key={i}>
              <div className="aspect-[3/4] bg-ink/8 mb-3" />
              <div className="h-3 w-3/4 bg-ink/8 mb-2" />
              <div className="h-3 w-1/2 bg-ink/8" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) return null;

  /* ── Recommendations ─────────────────────────────────────────── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40 mb-1">
            Section 04 — Similar Vibes
          </div>
          <h2 className="font-display-roman text-3xl md:text-4xl tracking-tight text-ink">
            You might also{" "}
            <em className="font-display text-vermilion">crack</em> these.
          </h2>
        </div>

        {/* Dev Mode toggle */}
        <button
          onClick={() => setDevMode((d) => !d)}
          className={`flex items-center gap-2 px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase border transition-colors ${
            devMode
              ? "bg-ink text-lime border-ink"
              : "text-ink/40 border-ink/20 hover:border-ink hover:text-ink"
          }`}
        >
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${
              devMode ? "bg-lime" : "bg-ink/20"
            }`}
          />
          Dev Mode
        </button>
      </div>

      {/* Dev Mode — model info bar */}
      {devMode && (
        <div className="mb-6 border border-lime/30 bg-lime/5 px-4 py-3 font-mono text-[10px] text-ink/60 flex flex-wrap gap-4">
          <span className="text-lime font-medium">● model: all-MiniLM-L6-v2</span>
          <span>metric: cosine similarity</span>
          <span>dimensions: 384</span>
          <span>engine: in-memory sklearn</span>
          <span>storage: pgvector (supabase)</span>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {recs.map((rec) => {
          const price   = rec.price_cents ? `$${(rec.price_cents / 100).toFixed(2)}` : "—";
          const pct     = Math.round(rec.similarity * 100);
          const accent  = CATEGORY_ACCENT[rec.normalized_category] ?? "text-ink/40";
          const simBar  = Math.max(4, pct); // min bar width %

          return (
            <Link
              key={rec.id}
              href={`/products/${rec.id}`}
              className="group flex flex-col"
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] relative overflow-hidden mb-3">
                {rec.image_url ? (
                  <div className="absolute inset-0 bg-cream-dim">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={rec.image_url}
                      alt={rec.name}
                      className="absolute inset-0 w-full h-full object-contain p-4 mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className={`absolute inset-0 flex flex-col justify-between p-4 ${CATEGORY_TILE[rec.normalized_category]?.bg ?? "bg-ink"} ${CATEGORY_TILE[rec.normalized_category]?.text ?? "text-cream"}`}>
                    {/* Category badge */}
                    <span className="font-mono text-[9px] tracking-widest uppercase opacity-70">
                      {CATEGORY_TILE[rec.normalized_category]?.label ?? rec.normalized_category}
                    </span>
                    {/* Product name */}
                    <p className="font-display text-xl leading-[1.05] tracking-tight">
                      {rec.name}
                    </p>
                    {/* Watermark */}
                    <span className="font-mono text-[8px] tracking-widest uppercase opacity-30">
                      CRACKED · CA
                    </span>
                  </div>
                )}

                {/* Dev Mode overlay — similarity score */}
                {devMode && (
                  <div className="absolute bottom-0 inset-x-0 bg-ink/90 px-2 py-1.5 pointer-events-none">
                    <div className="flex items-center justify-between font-mono text-[9px] text-lime mb-1">
                      <span>cosine sim</span>
                      <span className="font-medium">{rec.similarity.toFixed(4)}</span>
                    </div>
                    {/* Similarity bar */}
                    <div className="h-0.5 bg-lime/20 w-full">
                      <div
                        className="h-full bg-lime transition-all"
                        style={{ width: `${simBar}%` }}
                      />
                    </div>
                    <div className="text-right font-mono text-[8px] text-lime/50 mt-0.5">
                      pgvector match
                    </div>
                  </div>
                )}
              </div>

              {/* Info */}
              <p className={`font-mono text-[9px] tracking-widest uppercase mb-0.5 ${accent}`}>
                {rec.normalized_category.replace("_", " ")}
              </p>
              <p className="font-sans text-sm leading-snug text-ink group-hover:text-vermilion transition-colors line-clamp-2 mb-1">
                {rec.name}
              </p>
              <div className="flex items-center justify-between font-mono text-[10px] text-ink/40">
                <span className="uppercase tracking-widest truncate">{rec.brand_name}</span>
                <span className="flex-shrink-0 ml-2">{price}</span>
              </div>

              {/* Similarity pill (visible mode) */}
              {!devMode && (
                <div className="mt-1.5 font-mono text-[9px] text-ink/30">
                  {pct}% match
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
