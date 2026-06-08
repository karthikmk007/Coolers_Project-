"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThumbsUp, MessageCircle, ChevronDown } from "lucide-react";
import { initials } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface Review {
  id:           string;
  score:        number;
  review_text:  string | null;
  helpful_count:number;
  created_at:   string;
  profiles: {
    username:     string | null;
    display_name: string | null;
    avatar_url:   string | null;
    is_pro:       boolean;
  } | null;
}

interface ReviewFeedProps {
  productId: string;
  limit?:    number;
}

function StarRow({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-px">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={cn("text-xs", s <= Math.round(score) ? "text-cracked-orange" : "text-neutral-200")}
        >
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({ profile, size = 36 }: { profile: Review["profiles"]; size?: number }) {
  const name = profile?.display_name ?? profile?.username ?? "?";
  const img  = profile?.avatar_url;

  return (
    <div
      className="rounded-full bg-cracked-orange/20 flex items-center justify-center shrink-0 overflow-hidden text-cracked-orange font-bold font-[family-name:var(--font-bebas-neue)]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {img
        ? <img src={img} alt={name} width={size} height={size} className="object-cover w-full h-full" />
        : initials(name)
      }
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  const name = review.profiles?.display_name ?? review.profiles?.username ?? "Anonymous";
  const isPro = review.profiles?.is_pro ?? false;
  const text  = review.review_text ?? "";
  const isLong = text.length > 140;

  return (
    <div className="bg-white rounded-2xl p-4 border border-neutral-100 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar profile={review.profiles} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-cracked-dark font-[family-name:var(--font-dm-sans)] truncate">
                {name}
              </span>
              {isPro && (
                <span className="shrink-0 text-[9px] font-black bg-cracked-orange text-white px-1.5 py-0.5 rounded uppercase tracking-wide">
                  PRO
                </span>
              )}
            </div>
            <p className="text-[10px] text-cracked-muted font-[family-name:var(--font-dm-sans)]">
              {new Date(review.created_at).toLocaleDateString("en-CA", {
                month: "short", day: "numeric", year: "numeric",
              })}
            </p>
          </div>
        </div>
        <StarRow score={review.score} />
      </div>

      {/* Review text */}
      {text && (
        <div>
          <p
            className={cn(
              "text-sm text-cracked-dark/80 leading-relaxed font-[family-name:var(--font-dm-sans)]",
              !expanded && isLong && "line-clamp-3"
            )}
          >
            {text}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-[11px] text-cracked-orange font-semibold font-[family-name:var(--font-dm-sans)]"
            >
              {expanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 pt-1 border-t border-neutral-50">
        <button className="flex items-center gap-1 text-cracked-muted hover:text-cracked-orange transition-colors">
          <ThumbsUp className="w-3.5 h-3.5" />
          <span className="text-[11px] font-[family-name:var(--font-dm-sans)]">{review.helpful_count}</span>
        </button>
        <button className="flex items-center gap-1 text-cracked-muted">
          <MessageCircle className="w-3.5 h-3.5" />
          <span className="text-[11px] font-[family-name:var(--font-dm-sans)]">Reply</span>
        </button>
        <span className="ml-auto font-[family-name:var(--font-bebas-neue)] text-cracked-orange text-base">
          {review.score.toFixed(1)} ⚡
        </span>
      </div>
    </div>
  );
}

export function ReviewFeed({ productId, limit = 3 }: ReviewFeedProps) {
  const [reviews,  setReviews]  = useState<Review[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [showAll,  setShowAll]  = useState(false);

  useEffect(() => {
    async function load() {
      const sb = createClient();
      const { data, count } = await sb
        .from("ratings")
        .select(`
          id, score, review_text, helpful_count, created_at,
          profiles ( username, display_name, avatar_url, is_pro )
        `, { count: "exact" })
        .eq("product_id", productId)
        .not("review_text", "is", null)
        .order("helpful_count", { ascending: false })
        .order("created_at",    { ascending: false })
        .limit(showAll ? 50 : limit);

      setReviews((data ?? []) as unknown as Review[]);
      setTotal(count ?? 0);
      setLoading(false);
    }
    load();
  }, [productId, limit, showAll]);

  if (loading) {
    return (
      <div className="space-y-3 px-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-28 rounded-2xl bg-neutral-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4">
      <h3 className="font-[family-name:var(--font-bebas-neue)] text-xl text-cracked-dark">
        Community Reviews
        {total > 0 && (
          <span className="text-cracked-muted ml-2 text-base">({total})</span>
        )}
      </h3>

      {reviews.length === 0 ? (
        <div className="text-center py-8 text-cracked-muted text-sm font-[family-name:var(--font-dm-sans)]">
          No reviews yet — be the first to crack this one open.
        </div>
      ) : (
        <>
          <AnimatePresence>
            {reviews.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <ReviewCard review={r} />
              </motion.div>
            ))}
          </AnimatePresence>

          {total > limit && !showAll && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAll(true)}
              className="w-full py-3 border border-neutral-200 rounded-2xl text-sm font-semibold text-cracked-dark flex items-center justify-center gap-2 font-[family-name:var(--font-dm-sans)]"
            >
              Show all {total} reviews <ChevronDown className="w-4 h-4" />
            </motion.button>
          )}
        </>
      )}
    </div>
  );
}
