"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStore } from "@/store/userStore";
import { cn } from "@/lib/utils/cn";

interface TastePrefs {
  taste_sweet_pref: number;
  taste_bold_pref:  number;
  taste_carb_pref:  number;
  favorite_styles:  string[];
}

interface VibeCheckProps {
  onComplete: (prefs: TastePrefs) => void;
}

const QUESTIONS = [
  {
    key:      "seltzer",
    question: "How do we feel about Hard Seltzers?",
    hint:     "White Claw, Nude, Cottage Springs...",
    options:  [
      { emoji: "🤢", label: "Nope",     score: 10 },
      { emoji: "😐", label: "Meh",      score: 35 },
      { emoji: "🙂", label: "Sure",     score: 65 },
      { emoji: "🔥", label: "Obsessed", score: 90 },
    ],
  },
  {
    key:      "craft",
    question: "Craft beers and radlers?",
    hint:     "Creemore, Mill St., fruity radlers...",
    options:  [
      { emoji: "🤢", label: "Nope",     score: 10 },
      { emoji: "😐", label: "Meh",      score: 35 },
      { emoji: "🙂", label: "Sure",     score: 65 },
      { emoji: "🔥", label: "Obsessed", score: 90 },
    ],
  },
  {
    key:      "sweet",
    question: "Sweet or dry drinks?",
    hint:     "Lemonade coolers vs. crispy seltzers",
    options:  [
      { emoji: "🍋", label: "Dry all the way", score: 20 },
      { emoji: "⚖️", label: "Balanced",        score: 50 },
      { emoji: "🍬", label: "Kinda sweet",     score: 70 },
      { emoji: "🍭", label: "The sweeter the better", score: 90 },
    ],
  },
] as const;

async function fireConfetti() {
  const confetti = (await import("canvas-confetti")).default;
  confetti({
    particleCount: 120,
    spread: 80,
    origin: { y: 0.6 },
    colors: ["#F97316", "#A3E635", "#FFFBF5", "#111111"],
  });
}

export function VibeCheck({ onComplete }: VibeCheckProps) {
  const [step,    setStep]    = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [done,    setDone]    = useState(false);
  const setOnboarded = useUserStore((s) => s.setOnboarded);

  const handleAnswer = useCallback(
    async (score: number) => {
      const next = [...answers, score];
      setAnswers(next);

      if (step < QUESTIONS.length - 1) {
        // Auto-advance after 300ms
        setTimeout(() => setStep((s) => s + 1), 300);
      } else {
        // Complete!
        setDone(true);
        await fireConfetti();

        const prefs: TastePrefs = {
          taste_sweet_pref: next[2] ?? 50,
          taste_bold_pref:  next[1] ?? 50,
          taste_carb_pref:  next[0] ?? 65,
          favorite_styles:  [],
        };

        setOnboarded(true);
        setTimeout(() => onComplete(prefs), 1200);
      }
    },
    [answers, step, onComplete, setOnboarded]
  );

  const progress = ((step + (done ? 1 : 0)) / QUESTIONS.length) * 100;
  const q = QUESTIONS[step];

  return (
    <div className="min-h-screen bg-cracked-cream flex flex-col items-center justify-center px-6 pb-20">
      {/* Progress bar */}
      <div className="w-full max-w-sm mb-10">
        <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-cracked-orange rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
        <p className="text-[11px] text-cracked-muted mt-2 text-right font-[family-name:var(--font-dm-sans)]">
          {step + (done ? 1 : 0)}/{QUESTIONS.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {done ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-3"
          >
            <p className="text-5xl">🔥</p>
            <p
              className="text-cracked-dark"
              style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 32 }}
            >
              Your vibe is locked
            </p>
            <p className="text-cracked-muted text-sm font-[family-name:var(--font-dm-sans)]">
              Building your personalized cooler feed…
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="w-full max-w-sm space-y-8"
          >
            {/* Question */}
            <div className="text-center space-y-1">
              <h2
                className="text-cracked-dark leading-tight"
                style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 28 }}
              >
                {q.question}
              </h2>
              <p className="text-cracked-muted text-sm font-[family-name:var(--font-dm-sans)]">
                {q.hint}
              </p>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {q.options.map(({ emoji, label, score }) => (
                <motion.button
                  key={label}
                  whileHover={{ backgroundColor: "#FFF7ED", borderColor: "#F97316" }}
                  whileTap={{ scale: 0.92 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  onClick={() => handleAnswer(score)}
                  className="w-full h-20 rounded-2xl border-2 border-neutral-200 bg-white flex flex-col items-center justify-center gap-1 transition-colors"
                >
                  <span className="text-3xl">{emoji}</span>
                  <span className="text-xs font-semibold text-cracked-dark font-[family-name:var(--font-dm-sans)]">
                    {label}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
