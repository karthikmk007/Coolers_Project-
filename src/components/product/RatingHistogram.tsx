"use client";

import { motion } from "framer-motion";
import { scoreColor } from "@/lib/utils/score";
import { formatCount } from "@/lib/utils/format";

interface HistogramProps {
  counts: { 1: number; 2: number; 3: number; 4: number; 5: number };
  total:  number;
  avgScore: number;
}

const STAR_COLOR: Record<number, string> = {
  5: "#22C55E",
  4: "#22C55E",
  3: "#F59E0B",
  2: "#EF4444",
  1: "#EF4444",
};

function StarRow({ count, filled }: { count: number; filled: boolean }) {
  return (
    <span className={`text-sm ${filled ? "text-cracked-orange" : "text-neutral-200"}`}>
      ★
    </span>
  );
}

export function RatingHistogram({ counts, total, avgScore }: HistogramProps) {
  const color = scoreColor(avgScore);
  const filledStars = Math.round(avgScore);

  return (
    <div className="flex gap-6 items-start">
      {/* ── Left: Big score ── */}
      <div className="flex flex-col items-center min-w-[72px]">
        <span
          className="font-[family-name:var(--font-bebas-neue)] leading-none"
          style={{ fontSize: 52, color }}
        >
          {avgScore.toFixed(1)}
        </span>

        {/* Stars */}
        <div className="flex -mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <StarRow key={s} count={s} filled={s <= filledStars} />
          ))}
        </div>

        <p className="text-[11px] text-cracked-muted font-[family-name:var(--font-dm-sans)] mt-1 text-center">
          {formatCount(total)} ratings
        </p>
      </div>

      {/* ── Right: Bar chart ── */}
      <div className="flex-1 space-y-1.5 pt-1">
        {([5, 4, 3, 2, 1] as const).map((star, i) => {
          const count = counts[star];
          const pct   = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={star} className="flex items-center gap-2">
              {/* Star label */}
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-cracked-muted w-3 shrink-0">
                {star}
              </span>
              <span className="text-cracked-orange text-xs leading-none">★</span>

              {/* Bar */}
              <div className="flex-1 h-2 bg-neutral-100 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: STAR_COLOR[star] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{
                    duration: 0.4,
                    delay: i * 0.05,
                    ease: "easeOut",
                  }}
                />
              </div>

              {/* Percentage */}
              <span className="font-[family-name:var(--font-jetbrains)] text-[10px] text-cracked-muted w-7 text-right shrink-0">
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
