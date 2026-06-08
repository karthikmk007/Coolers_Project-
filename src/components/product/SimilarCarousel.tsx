"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Plus } from "lucide-react";
import { ScoreCircle } from "./ScoreCircle";
import { formatPrice } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";

interface SimilarProduct {
  id:           string;
  name:         string;
  brand:        string;
  style:        string | null;
  price:        number | null;
  thumbnail_url:string | null;
  image_url:    string | null;
  avg_score?:   number;
  rating_count?:number;
}

interface SimilarCarouselProps {
  productId: string;
  style?:    string | null;
  limit?:    number;
}

export function SimilarCarousel({ productId, style, limit = 8 }: SimilarCarouselProps) {
  const [items, setItems] = useState<SimilarProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const sb = createClient();

      // Try ML API first, fall back to style-match
      const mlUrl = process.env.NEXT_PUBLIC_ML_API_URL;
      let productIds: string[] = [];

      if (mlUrl) {
        try {
          const r = await fetch(`${mlUrl}/recommend/hybrid?product_id=${productId}&n=${limit}`, {
            signal: AbortSignal.timeout(3000),
          });
          if (r.ok) {
            const d = await r.json();
            productIds = (d.results ?? []).map((x: { id: number }) => String(x.id));
          }
        } catch { /* fall through to Supabase */ }
      }

      if (productIds.length > 0) {
        const { data } = await sb
          .from("products")
          .select("id, name, brand, style, price, thumbnail_url, image_url")
          .in("id", productIds)
          .limit(limit);
        setItems((data ?? []) as SimilarProduct[]);
      } else {
        // Fallback: same style, exclude self
        const query = sb
          .from("products")
          .select("id, name, brand, style, price, thumbnail_url, image_url")
          .neq("id", productId)
          .limit(limit);

        const { data } = style
          ? await query.eq("style", style)
          : await query;

        setItems((data ?? []) as SimilarProduct[]);
      }

      setLoading(false);
    }
    load();
  }, [productId, style, limit]);

  if (loading) {
    return (
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="shrink-0 w-36 h-52 rounded-2xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!items.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-[family-name:var(--font-bebas-neue)] text-xl text-cracked-dark px-4">
        The Next Round 🍺
      </h3>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x snap-mandatory">
        {items.map((p) => (
          <motion.div
            key={p.id}
            className="snap-start shrink-0 w-36 h-52 rounded-2xl bg-white border border-neutral-100 overflow-hidden flex flex-col relative"
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <Link href={`/product/${p.id}`} className="flex flex-col h-full">
              {/* Image — top 60% */}
              <div className="relative h-[58%] bg-neutral-50 flex items-center justify-center overflow-hidden">
                {p.thumbnail_url || p.image_url ? (
                  <Image
                    src={(p.thumbnail_url ?? p.image_url)!}
                    alt={p.name}
                    fill
                    className="object-contain p-2"
                    sizes="144px"
                  />
                ) : (
                  <span className="text-[10px] text-neutral-300 text-center px-2">{p.name}</span>
                )}

                {/* Score overlay */}
                {p.avg_score && (
                  <div className="absolute bottom-2 right-2">
                    <ScoreCircle score={p.avg_score} size="sm" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col flex-1 p-2.5 gap-1">
                <p className="text-[9px] text-cracked-muted truncate font-[family-name:var(--font-dm-sans)]">
                  {p.brand}
                </p>
                <p className="text-xs font-semibold line-clamp-2 leading-tight font-[family-name:var(--font-dm-sans)] text-cracked-dark">
                  {p.name}
                </p>

                {p.avg_score && (
                  <div className="flex items-center gap-0.5">
                    <span className="text-cracked-orange text-xs">★</span>
                    <span className="text-[10px] font-[family-name:var(--font-jetbrains)] text-cracked-dark">
                      {p.avg_score.toFixed(1)}
                    </span>
                    {p.rating_count && (
                      <span className="text-[9px] text-cracked-muted ml-0.5">
                        ({p.rating_count})
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between mt-auto">
                  <span className="font-[family-name:var(--font-jetbrains)] text-xs font-bold text-cracked-orange">
                    {formatPrice(p.price)}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 hover:text-cracked-orange"
                    >
                      <Bookmark className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="w-6 h-6 rounded-full bg-cracked-orange flex items-center justify-center text-white"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
