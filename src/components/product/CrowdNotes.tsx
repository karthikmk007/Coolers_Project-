"use client";

import { motion } from "framer-motion";
import Image from "next/image";

import type { CrowdNote } from "@/lib/utils/crowd-notes";
export type { CrowdNote };

// ── Default ingredient images (fallback by keyword) ───────────
const INGREDIENT_IMGS: Record<string, string> = {
  lemon:      "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?w=320&q=80",
  lime:       "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=320&q=80",
  mango:      "https://images.unsplash.com/photo-1553279768-865429fa0078?w=320&q=80",
  berry:      "https://images.unsplash.com/photo-1488900128323-21503983a07e?w=320&q=80",
  peach:      "https://images.unsplash.com/photo-1595475207225-428b62bda831?w=320&q=80",
  apple:      "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=320&q=80",
  coconut:    "https://images.unsplash.com/photo-1580984969071-a8da5656c2fb?w=320&q=80",
  pineapple:  "https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=320&q=80",
  grapefruit: "https://images.unsplash.com/photo-1577234286642-fc512a5f8f11?w=320&q=80",
  watermelon: "https://images.unsplash.com/photo-1589984662646-e7b2e4962f18?w=320&q=80",
  cherry:     "https://images.unsplash.com/photo-1528821128474-27f963b062bf?w=320&q=80",
  cranberry:  "https://images.unsplash.com/photo-1607920591413-4ec007e70023?w=320&q=80",
  default:    "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=320&q=80",
};

function resolveImg(label: string, provided?: string): string {
  if (provided) return provided;
  const lower = label.toLowerCase();
  for (const [key, url] of Object.entries(INGREDIENT_IMGS)) {
    if (lower.includes(key)) return url;
  }
  return INGREDIENT_IMGS.default;
}

interface CrowdNotesProps {
  notes: CrowdNote[];
}

export function CrowdNotes({ notes }: CrowdNotesProps) {
  if (!notes.length) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-[family-name:var(--font-bebas-neue)] text-xl text-cracked-dark px-4">
        🍋 How does this taste?
      </h3>

      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-2 snap-x snap-mandatory">
        {notes.map((note, i) => {
          const imgSrc = resolveImg(note.label, note.imageUrl);

          return (
            <motion.div
              key={i}
              className="snap-start shrink-0 w-40 h-40 rounded-2xl overflow-hidden relative cursor-pointer"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Ingredient image — top-left diagonal */}
              <div className="absolute inset-0">
                <Image
                  src={imgSrc}
                  alt={note.label}
                  fill
                  className="object-cover"
                  sizes="160px"
                  unoptimized
                />
              </div>

              {/* Dark gradient overlay — bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p
                  className="text-white leading-none font-bold"
                  style={{
                    fontFamily: "var(--font-bebas-neue)",
                    fontSize: 36,
                    lineHeight: 1,
                  }}
                >
                  {note.mentions >= 1000
                    ? `${(note.mentions / 1000).toFixed(1)}k`
                    : note.mentions}
                </p>
                <p className="text-white/70 text-[10px] font-[family-name:var(--font-dm-sans)] leading-tight">
                  mentions of {note.category}
                </p>
                <p className="text-white/60 text-[9px] font-[family-name:var(--font-dm-sans)] mt-0.5 truncate">
                  {note.label}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// Re-export for convenience (components that already imported from here)
export { notesFromFlavors } from "@/lib/utils/crowd-notes";
