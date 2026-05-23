"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL || "";

export function Recommendations({ productId }: { productId: number }) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [devMode, setDevMode] = useState(true);

  useEffect(() => {
    // If no ML API URL is configured, skip the fetch entirely
    if (!ML_API_URL) {
      setError(true);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchRecs() {
      try {
        const res = await fetch(`${ML_API_URL}/recommend`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId, limit: 4 }),
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setRecommendations(data.results || []);
      } catch {
        // Silently degrade — the offline banner handles the UX
        if (!controller.signal.aborted) {
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchRecs();

    return () => controller.abort();
  }, [productId]);

  if (error) {
    return (
      <div className="mt-8 border border-ink/10 bg-ink/5 p-6 relative">
        <div className="absolute -top-3 left-4 bg-ink text-cream px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest">
          ML Layer · Offline
        </div>
        <p className="font-mono text-sm text-ink/50 leading-relaxed">
          Recommendation engine is not connected.{" "}
          {!ML_API_URL && (
            <span className="text-ink/30">
              Set <code className="text-vermilion/60">NEXT_PUBLIC_ML_API_URL</code> in{" "}
              <code className="text-vermilion/60">.env.local</code> and start the FastAPI server.
            </span>
          )}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mt-8 border border-ink/10 p-6 animate-pulse bg-ink/5">
        <div className="h-4 w-48 bg-ink/10 mb-4" />
        <div className="h-32 bg-ink/5" />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 border-t border-ink/10 pt-12">
      <div className="flex items-center justify-between mb-8">
        <h2 className="font-display text-3xl text-ink">Similar Profiles</h2>
        <button
          onClick={() => setDevMode(!devMode)}
          className={`px-3 py-1 font-mono text-[10px] tracking-widest uppercase transition-colors border ${
            devMode ? "bg-lime text-ink border-lime" : "bg-transparent text-ink/40 border-ink/20"
          }`}
        >
          Dev Mode {devMode ? "ON" : "OFF"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative">
        {recommendations.map((rec) => (
          <div key={rec.id} className="relative group">
            {/* The recommendation card itself */}
            <Link
              href={`/products/${rec.id}`}
              className="flex items-center gap-4 p-4 border border-ink/10 hover:border-ink/40 transition-colors bg-cream"
            >
              <div className="w-16 h-16 bg-ink/5 flex-shrink-0 flex items-center justify-center p-2">
                {rec.image_url ? (
                  <img
                    src={rec.image_url}
                    alt={rec.name}
                    className="object-contain w-full h-full mix-blend-multiply"
                  />
                ) : (
                  <div className="font-display text-xl text-ink/20">
                    {rec.normalized_category.substring(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-ink/40">
                  {rec.brand_name || "Unknown"}
                </div>
                <div className="font-sans font-bold text-sm leading-tight text-ink group-hover:text-vermilion transition-colors">
                  {rec.name}
                </div>
              </div>
            </Link>

            {/* Dev Mode Overlay */}
            {devMode && (
              <div className="absolute -top-3 -right-3 bg-ink text-lime px-2 py-1 font-mono text-[10px] z-10 pointer-events-none flex flex-col gap-1 items-end shadow-sm">
                <span>cosine sim: {rec.similarity.toFixed(4)}</span>
                <span className="text-cream/50 text-[8px]">pgvector match</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
