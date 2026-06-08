"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, MoreHorizontal, Share2, Flag } from "lucide-react";
import { RatingInput } from "@/components/rating/RatingInput";
import { cn } from "@/lib/utils/cn";

interface ProductActionsProps {
  productId: string;
  style?:    string | null;
}

export function ProductActions({ productId, style }: ProductActionsProps) {
  const [saved,    setSaved]    = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [flash,    setFlash]    = useState(false);

  function handleSave() {
    setSaved((v) => !v);
    if (!saved) { setFlash(true); setTimeout(() => setFlash(false), 1200); }
  }

  return (
    <div className="px-4 mt-4">
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 space-y-3">
        {/* Rate label */}
        <p className="text-xs font-semibold text-cracked-muted uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
          Rate this {style?.toLowerCase() ?? "drink"}
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Rating input */}
          <RatingInput productId={productId} />

          {/* Save */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={handleSave}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2.5 rounded-xl border-2 text-sm font-bold font-[family-name:var(--font-dm-sans)] transition-colors",
              flash  ? "bg-cracked-lime/20 border-cracked-lime text-cracked-dark scale-[1.04]" :
              saved  ? "bg-cracked-dark border-cracked-dark text-white" :
                       "bg-white border-neutral-200 text-cracked-muted"
            )}
          >
            <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
            {flash ? "Saved!" : saved ? "Saved" : "Save"}
          </motion.button>

          {/* More */}
          <div className="relative ml-auto">
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => setShowMore((v) => !v)}
              className="w-10 h-10 rounded-xl border border-neutral-200 flex items-center justify-center text-cracked-muted"
            >
              <MoreHorizontal className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
              {showMore && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1,    y: 0  }}
                  exit={{   opacity: 0, scale: 0.92, y: -4  }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 bg-white rounded-2xl border border-neutral-100 shadow-lg p-2 z-20 w-44"
                >
                  {[
                    { Icon: Share2, label: "Share" },
                    { Icon: Flag,   label: "Report" },
                  ].map(({ Icon, label }) => (
                    <button
                      key={label}
                      onClick={() => setShowMore(false)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-neutral-50 text-sm font-[family-name:var(--font-dm-sans)] text-cracked-dark"
                    >
                      <Icon className="w-4 h-4 text-cracked-muted" />
                      {label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
