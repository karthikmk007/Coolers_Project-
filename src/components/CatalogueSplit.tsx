"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { ProductTile } from "./ProductTile";
import { ProductDrawer } from "./ProductDrawer";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["product"]["Row"] & {
  brand: { name: string } | null;
};

type Category = "all" | "hard_seltzer" | "cooler" | "cider" | "radler" | "other";

const CAT_META: Record<string, { label: string; accent: string; text: string; desc: string }> = {
  hard_seltzer: { label: "Seltzer",  accent: "bg-lime",      text: "text-ink",   desc: "Sparkling, low-cal" },
  cooler:       { label: "Cooler",   accent: "bg-vermilion", text: "text-cream", desc: "Sweet & spirit-based" },
  cider:        { label: "Cider",    accent: "bg-amber",     text: "text-cream", desc: "Apple & pear" },
  radler:       { label: "Radler",   accent: "bg-lime-dim",  text: "text-ink",   desc: "Beer & citrus blend" },
  other:        { label: "RTD",      accent: "bg-ink",       text: "text-cream", desc: "Ready-to-drink" },
};

export function CatalogueSplit({ initialProducts }: { initialProducts: Product[] }) {
  const [selectedId,     setSelectedId]     = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery,    setSearchQuery]    = useState("");
  const asideRef = useRef<HTMLElement>(null);

  // Auto-select first product on mount
  useEffect(() => {
    if (initialProducts.length > 0 && selectedId === null) {
      setSelectedId(initialProducts[0].id);
    }
  }, [initialProducts]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll drawer back to top whenever the selected product changes (#4 + #8)
  useEffect(() => {
    if (asideRef.current) asideRef.current.scrollTop = 0;
  }, [selectedId]);

  const counts = useMemo(() => ({
    all:          initialProducts.length,
    hard_seltzer: initialProducts.filter(p => p.normalized_category === "hard_seltzer").length,
    cooler:       initialProducts.filter(p => p.normalized_category === "cooler").length,
    cider:        initialProducts.filter(p => p.normalized_category === "cider").length,
    radler:       initialProducts.filter(p => p.normalized_category === "radler").length,
    other:        initialProducts.filter(p => p.normalized_category === "other").length,
  }), [initialProducts]);

  // Filter by category then by search (#6)
  const filtered = useMemo(() => {
    let list = activeCategory === "all"
      ? initialProducts
      : initialProducts.filter(p => p.normalized_category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.brand?.name ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [initialProducts, activeCategory, searchQuery]);

  const selected = selectedId !== null
    ? (initialProducts.find(p => p.id === selectedId) ?? null)
    : null;

  const handleCategoryClick = (cat: Category) => {
    setActiveCategory(cat);
    setSearchQuery("");
    const first = cat === "all"
      ? initialProducts[0]
      : initialProducts.find(p => p.normalized_category === cat);
    if (first) setSelectedId(first.id);
  };

  const handleSelect = (id: number) => {
    setSelectedId(id);
  };

  // On mobile: show catalogue OR drawer, not both simultaneously (#1)
  const showCatalogue = !selected; // mobile: hide catalogue when drawer open
  const showDrawer    = !!selected;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#111209" }}>

      {/* ═══════════════ LEFT — Dark Catalogue ═══════════════ */}
      {/*
          Mobile  (<lg): full-screen, hidden when a product is selected
          Desktop (≥lg): flex-1, always visible
      */}
      <div className={`
        flex-col overflow-hidden
        ${showCatalogue ? "flex" : "hidden"}
        lg:flex lg:flex-1 lg:min-w-0
      `}>

        {/* Header */}
        <header className="shrink-0 px-6 lg:px-8 pt-6 pb-4 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-display-roman font-black text-[clamp(2rem,4.5vw,4rem)] text-white tracking-tight leading-none">
              CRACKED.
            </h1>
            <p className="font-mono text-[9px] uppercase tracking-widest text-white/25 mt-1">
              V1.0.4-BETA / TORONTO, ON
            </p>
          </div>
          <div className="flex items-center gap-4 pb-0.5">
            <Link
              href="/browse"
              className="font-mono text-[9px] uppercase tracking-widest text-white/35 hover:text-white transition-colors"
            >
              Catalogue
            </Link>
            <Link
              href="/login"
              className="font-mono text-[9px] uppercase tracking-widest text-white/35 hover:text-white transition-colors"
            >
              Sign In →
            </Link>
          </div>
        </header>

        {/* Section heading */}
        <div className="shrink-0 px-6 lg:px-8 pb-0">
          <h2 className="font-display text-[clamp(1.5rem,2.8vw,2.6rem)] text-white/90 leading-tight mb-3">
            What&apos;s <em className="text-vermilion not-italic">cold</em> right now
          </h2>

          {/* ── Search bar (#6) ── */}
          <div className="relative mb-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/30 pointer-events-none">
              ⌕
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search 482 products…"
              className="w-full border border-white/12 bg-white/5 pl-8 pr-4 py-2.5 font-mono text-[11px] text-white placeholder:text-white/25 focus:outline-none focus:border-white/35 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[10px] text-white/30 hover:text-white transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          {/* ── Category filter chips (#3) ── */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3">
            <button
              onClick={() => handleCategoryClick("all")}
              className={`shrink-0 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                activeCategory === "all"
                  ? "bg-white text-[#111209]"
                  : "border border-white/20 text-white/45 hover:border-white/50 hover:text-white/70"
              }`}
            >
              All <span className="opacity-60">{counts.all}</span>
            </button>
            {(Object.entries(CAT_META) as [string, typeof CAT_META[string]][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => handleCategoryClick(key as Category)}
                className={`shrink-0 px-3 py-1.5 font-mono text-[9px] uppercase tracking-widest transition-colors ${
                  activeCategory === key
                    ? `${meta.accent} ${meta.text}`
                    : "border border-white/20 text-white/45 hover:border-white/50 hover:text-white/70"
                }`}
              >
                {meta.label} <span className="opacity-60">{counts[key as keyof typeof counts]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Horizontal product scroll ── */}
        <div className="shrink-0 h-[280px] overflow-hidden">
          {filtered.length > 0 ? (
            <div className="flex gap-4 overflow-x-auto h-full items-start px-6 lg:px-8 pb-5 pt-1 scrollbar-hide">
              {filtered.map(p => (
                <ProductTile
                  key={p.id}
                  product={p}
                  selected={p.id === selectedId}
                  onClick={() => handleSelect(p.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full px-8">
              <p className="font-mono text-[10px] uppercase tracking-widest text-white/25">
                No products match &ldquo;{searchQuery}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* ── Browse by type ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 lg:px-8 py-4 border-t border-white/6">
          <p className="font-mono text-[8px] uppercase tracking-widest text-white/25 mb-3">
            Browse by type
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {(Object.entries(CAT_META) as [string, typeof CAT_META[string]][]).map(([key, meta]) => (
              <button
                key={key}
                onClick={() => handleCategoryClick(key as Category)}
                className={`group relative text-left p-4 transition-all duration-150 ${
                  activeCategory === key
                    ? `${meta.accent} ${meta.text} scale-[1.02]`
                    : "border border-white/10 hover:border-white/30"
                }`}
              >
                <p className={`font-mono text-[7px] uppercase tracking-widest mb-2 ${
                  activeCategory === key ? `${meta.text} opacity-70` : "text-white/35"
                }`}>
                  {meta.desc}
                </p>
                <p className={`font-display-roman font-black text-xl leading-none mb-1 ${
                  activeCategory === key ? meta.text : "text-white"
                }`}>
                  {meta.label}
                </p>
                <p className={`font-mono text-[9px] ${
                  activeCategory === key ? `${meta.text} opacity-60` : "text-white/35"
                }`}>
                  {counts[key as keyof typeof counts]} products
                </p>
                {activeCategory === key && (
                  <div className="absolute bottom-0 inset-x-0 h-[2px] bg-white/30" />
                )}
              </button>
            ))}
          </div>

          {/* Stats strip */}
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/6 pt-4">
            <div>
              <span className="font-display-roman font-black text-2xl text-white leading-none">
                {searchQuery ? filtered.length : counts.all}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-white/30 ml-2">
                {searchQuery ? `matching "${searchQuery}"` : "Total Products"}
              </span>
            </div>
            <div className="w-px h-5 bg-white/10 hidden sm:block" />
            <span className="font-mono text-[8px] uppercase tracking-widest text-white/30 hidden sm:block">
              Sourced from LCBO · Ontario, Canada
            </span>
            <div className="ml-auto">
              <span className="font-mono text-[8px] uppercase tracking-widest text-vermilion">
                ML-Ranked ↗
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="shrink-0 border-t border-white/8 px-6 lg:px-8 py-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-display-roman font-black text-lg text-white mb-1">CRACKED.</p>
              <p className="font-mono text-[9px] text-white/30 leading-relaxed max-w-xs">
                Technical portfolio piece demonstrating end-to-end ML
                engineering and data ingestion. Built with high-frequency
                LCBO scraping.
              </p>
            </div>
            <div>
              <p className="font-mono text-[8px] uppercase tracking-widest text-vermilion mb-3">
                Architecture
              </p>
              <ul className="space-y-1.5">
                {[
                  "Supabase Postgres w/ Vector",
                  "Express API Gateway",
                  "HuggingFace Inference",
                ].map(s => (
                  <li key={s} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-vermilion shrink-0" />
                    <span className="font-mono text-[9px] text-white/40">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </footer>
      </div>

      {/* ═══════════════ RIGHT — Cream Drawer ═══════════════ */}
      {/*
          Mobile  (<lg): full-screen, shown only when product selected
          Desktop (≥lg): fixed width sidebar, always rendered
      */}
      <aside
        ref={asideRef}
        className={`
          overflow-y-auto
          ${showDrawer ? "flex flex-col" : "hidden"}
          lg:flex lg:flex-col
          w-full lg:w-[430px] xl:w-[480px] lg:shrink-0
          border-l border-white/10
        `}
        style={{ background: "#F2EDE0" }}
      >
        {selected ? (
          <ProductDrawer
            product={selected}
            onClose={() => setSelectedId(null)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/20">
              ← Select a product
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
