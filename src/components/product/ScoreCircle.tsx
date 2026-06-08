"use client";

import { useEffect, useRef } from "react";
import { useMotionValue, useSpring, motion } from "framer-motion";
import { scoreColor } from "@/lib/utils/score";

type Size = "sm" | "md" | "lg";

const SIZE_MAP: Record<Size, { px: number; r: number; stroke: number; fontSize: number }> = {
  sm: { px: 40, r: 16, stroke: 3,   fontSize: 12 },
  md: { px: 56, r: 23, stroke: 3,   fontSize: 16 },
  lg: { px: 72, r: 29, stroke: 3.5, fontSize: 22 },
};

interface ScoreCircleProps {
  score: number;        // 0–5
  size?: Size;
  animate?: boolean;    // default true
}

export function ScoreCircle({ score, size = "md", animate = true }: ScoreCircleProps) {
  const { px, r, stroke, fontSize } = SIZE_MAP[size];
  const cx = px / 2;
  const cy = px / 2;
  const circumference = 2 * Math.PI * r;
  const color = scoreColor(score);

  // ── Animated number count-up ─────────────────────────────
  const motionScore = useMotionValue(animate ? 0 : score);
  const springScore = useSpring(motionScore, { stiffness: 60, damping: 15 });
  const textRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    if (!animate) return;
    motionScore.set(score);
  }, [score, animate, motionScore]);

  useEffect(() => {
    return springScore.on("change", (v) => {
      if (textRef.current) textRef.current.textContent = v.toFixed(1);
    });
  }, [springScore]);

  // ── SVG arc progress ─────────────────────────────────────
  const targetOffset = circumference - (score / 5) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: px, height: px }}>
      <svg width={px} height={px} style={{ transform: "rotate(-90deg)" }}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: animate ? targetOffset : targetOffset }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        />
      </svg>

      {/* Score number */}
      <svg
        width={px} height={px}
        className="absolute inset-0"
        style={{ fontFamily: "var(--font-bebas-neue), sans-serif" }}
      >
        <text
          ref={textRef}
          x={cx} y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={fontSize}
          fontWeight="bold"
          fill={color}
        >
          {animate ? "0.0" : score.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}
