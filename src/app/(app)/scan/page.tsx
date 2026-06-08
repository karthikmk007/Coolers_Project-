"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ScanLine } from "lucide-react";
import { ScanViewfinder } from "@/components/scan/ScanViewfinder";

export default function ScanPage() {
  const [active, setActive] = useState(false);

  if (active) {
    return <ScanViewfinder onClose={() => setActive(false)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-screen bg-cracked-cream flex flex-col items-center justify-center px-6 pb-20 gap-6"
    >
      {/* Icon */}
      <div className="w-24 h-24 rounded-full bg-cracked-orange/10 flex items-center justify-center">
        <ScanLine className="w-12 h-12 text-cracked-orange" />
      </div>

      {/* Heading */}
      <div className="text-center space-y-2">
        <h1
          className="text-cracked-dark"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
        >
          Scan a Can
        </h1>
        <p className="text-cracked-muted text-sm font-[family-name:var(--font-dm-sans)] max-w-xs">
          Point your camera at any LCBO can label to instantly look up ratings, flavour notes, and similar picks.
        </p>
      </div>

      {/* Launch button */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        onClick={() => setActive(true)}
        className="w-full max-w-xs py-4 bg-cracked-orange text-white rounded-2xl font-bold uppercase tracking-widest text-sm shadow-lg shadow-orange-300/40 font-[family-name:var(--font-dm-sans)]"
      >
        Open Camera →
      </motion.button>

      {/* Tips */}
      <div className="w-full max-w-xs space-y-3 mt-2">
        {[
          { emoji: "💡", text: "Works best in good lighting" },
          { emoji: "📐", text: "Hold steady ~20cm from the label" },
          { emoji: "🍺", text: "Supports all LCBO barcodes" },
        ].map(({ emoji, text }) => (
          <div key={text} className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border border-neutral-100">
            <span className="text-xl">{emoji}</span>
            <span className="text-sm text-cracked-muted font-[family-name:var(--font-dm-sans)]">{text}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
