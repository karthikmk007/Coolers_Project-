"use client";

import { useEffect, useState } from "react";

const SHELF_KEY = "cracked:shelf";

function getShelf(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SHELF_KEY);
    return new Set(raw ? (JSON.parse(raw) as number[]) : []);
  } catch {
    return new Set();
  }
}

function saveShelf(shelf: Set<number>) {
  localStorage.setItem(SHELF_KEY, JSON.stringify([...shelf]));
}

export function AddToShelfButton({ productId }: { productId: number }) {
  const [saved, setSaved]         = useState(false);
  const [animating, setAnimating] = useState(false);

  // Initialise from localStorage after hydration
  useEffect(() => {
    setSaved(getShelf().has(productId));
  }, [productId]);

  function handleClick() {
    setAnimating(true);
    setSaved((prev) => {
      const shelf = getShelf();
      if (prev) {
        shelf.delete(productId);
      } else {
        shelf.add(productId);
      }
      saveShelf(shelf);
      return !prev;
    });
    setTimeout(() => setAnimating(false), 300);
  }

  return (
    <button
      onClick={handleClick}
      aria-label={saved ? "Remove from shelf" : "Add to shelf"}
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
