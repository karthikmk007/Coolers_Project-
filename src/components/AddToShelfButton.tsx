"use client";

import { useState } from "react";

export function AddToShelfButton({ productId }: { productId: number }) {
  const [saved, setSaved] = useState(false);
  const [animating, setAnimating] = useState(false);

  function handleClick() {
    setAnimating(true);
    setSaved((s) => !s);
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-2 px-6 md:px-8 py-3 font-mono text-[11px] font-bold tracking-widest uppercase transition-all duration-200 ${
        animating ? "scale-95" : "scale-100"
      } ${
        saved
          ? "bg-ink text-lime border border-lime/40 hover:bg-ink/80"
          : "bg-lime text-ink hover:bg-lime/80"
      }`}
    >
      <span className="text-base leading-none">{saved ? "✓" : "+"}</span>
      <span>{saved ? "On Your Shelf" : "Add to Shelf"}</span>
    </button>
  );
}
