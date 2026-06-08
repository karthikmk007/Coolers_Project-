"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { useUserStore } from "@/store/userStore";
import { createClient } from "@/lib/supabase/client";

interface RatingInputProps {
  productId: string;
  onRated?:  (score: number) => void;
}

function LightningIcon({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
      <path d="M13 2L4.09 12.96A1 1 0 005 14.5h6l-1 7.5L19.91 11.04A1 1 0 0019 9.5h-6l1-7.5z" />
    </svg>
  );
}

export function RatingInput({ productId, onRated }: RatingInputProps) {
  const { ratings, setRating, isLoggedIn } = useUserStore();
  const existingScore = ratings[productId] ?? null;

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [editing,    setEditing]    = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bounceIdx,  setBounceIdx]  = useState<number | null>(null);

  const displayScore = existingScore !== null && !editing ? existingScore : null;

  // Show compact "Your rating: X ⚡" when already rated
  if (displayScore !== null && !editing) {
    return (
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => setEditing(true)}
        className="flex items-center gap-1.5 bg-cracked-orange/10 border border-cracked-orange/40 text-cracked-orange px-4 py-2.5 rounded-xl text-sm font-bold font-[family-name:var(--font-dm-sans)]"
      >
        Your rating: {displayScore}
        <LightningIcon filled />
        <span className="text-xs opacity-60 ml-1">tap to edit</span>
      </motion.button>
    );
  }

  async function handleTap(score: number) {
    if (!isLoggedIn) {
      // Optimistic without user — still show feedback
      setRating(productId, score);
      setBounceIdx(score);
      setTimeout(() => setBounceIdx(null), 300);
      onRated?.(score);
      return;
    }

    setBounceIdx(score);
    setTimeout(() => setBounceIdx(null), 300);

    // Optimistic update
    setRating(productId, score);
    setEditing(false);
    onRated?.(score);

    // Persist to Supabase
    setSubmitting(true);
    try {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (user) {
        await sb
          .from("ratings")
          .upsert(
            { user_id: user.id, product_id: productId, score },
            { onConflict: "user_id,product_id" }
          );
      }
    } catch (e) {
      console.error("Rating save failed:", e);
    } finally {
      setSubmitting(false);
    }
  }

  const activeIdx = hoveredIdx ?? existingScore ?? 0;

  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((score) => {
        const filled = score <= activeIdx;
        const isBouncing = bounceIdx === score;

        return (
          <motion.button
            key={score}
            whileTap={{ scale: 1.35 }}
            animate={isBouncing ? { scale: [1, 1.35, 1] } : { scale: 1 }}
            transition={
              isBouncing
                ? { duration: 0.2, ease: "easeOut" }
                : { type: "spring", stiffness: 400, damping: 25 }
            }
            onMouseEnter={() => setHoveredIdx(score)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => handleTap(score)}
            disabled={submitting}
            className={cn(
              "w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-colors",
              filled
                ? "bg-cracked-orange/20 border-cracked-orange text-cracked-orange"
                : "bg-neutral-50 border-neutral-200 text-neutral-300"
            )}
            aria-label={`Rate ${score} out of 5`}
          >
            <LightningIcon filled={filled} />
          </motion.button>
        );
      })}

      <AnimatePresence>
        {submitting && (
          <motion.span
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-cracked-muted ml-1"
          >
            Saving…
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
