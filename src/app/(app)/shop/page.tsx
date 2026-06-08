"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Search, X, SlidersHorizontal, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ScoreCircle } from "@/components/product/ScoreCircle";
import { formatPrice, formatAbv } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type SortKey = "name" | "price_asc" | "price_desc" | "abv";
type Product = {
  id:            string;
  name:          string;
  brand:         string;
  style:         string | null;
  price:         number | null;
  abv:           number | null;
  thumbnail_url: string | null;
  tags:          string[];
};

const STYLES = ["Hard Seltzer", "Cider", "Hard Cider", "RTD Cocktail", "Cooler", "Hard Tea", "Radler", "Caesar"];
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name",       label: "Name A–Z"     },
  { key: "price_asc",  label: "Price ↑"      },
  { key: "price_desc", label: "Price ↓"      },
  { key: "abv",        label: "ABV ↑"        },
];

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [query,    setQuery]    = useState("");
  const [style,    setStyle]    = useState<string | null>(null);
  const [sort,     setSort]     = useState<SortKey>("name");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState(50);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    createClient()
      .from("products")
      .select("id, name, brand, style, price, abv, thumbnail_url, tags")
      .order("name")
      .then(({ data }) => {
        setProducts((data ?? []) as Product[]);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    let list = products;

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          (p.style ?? "").toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (style) list = list.filter((p) => p.style === style);

    list = list.filter((p) => (p.price ?? 0) <= maxPrice);

    return [...list].sort((a, b) => {
      if (sort === "price_asc")  return (a.price ?? 0) - (b.price ?? 0);
      if (sort === "price_desc") return (b.price ?? 0) - (a.price ?? 0);
      if (sort === "abv")        return (a.abv ?? 0) - (b.abv ?? 0);
      return a.name.localeCompare(b.name);
    });
  }, [products, query, style, sort, maxPrice]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-screen bg-cracked-cream"
    >
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-4 sticky top-0 bg-cracked-cream/90 backdrop-blur-sm z-20">
        <h1
          className="text-cracked-dark mb-3"
          style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
        >
          Shop RTDs
        </h1>

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-neutral-200 rounded-2xl px-3 py-2.5">
            <Search className="w-4 h-4 text-cracked-muted shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => startTransition(() => setQuery(e.target.value))}
              placeholder={`Search ${products.length} RTDs…`}
              className="flex-1 text-sm outline-none bg-transparent font-[family-name:var(--font-dm-sans)] text-cracked-dark placeholder:text-neutral-400"
            />
            {query && (
              <button onClick={() => setQuery("")}>
                <X className="w-3.5 h-3.5 text-cracked-muted" />
              </button>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              "w-11 h-11 rounded-2xl border flex items-center justify-center",
              showFilters
                ? "bg-cracked-orange border-cracked-orange text-white"
                : "bg-white border-neutral-200 text-cracked-muted"
            )}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Filter drawer */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{   height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-3 space-y-3">
                {/* Style chips */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  <button
                    onClick={() => setStyle(null)}
                    className={cn(
                      "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border font-[family-name:var(--font-dm-sans)]",
                      !style
                        ? "bg-cracked-dark text-white border-cracked-dark"
                        : "bg-white text-cracked-muted border-neutral-200"
                    )}
                  >
                    All
                  </button>
                  {STYLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(style === s ? null : s)}
                      className={cn(
                        "shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border font-[family-name:var(--font-dm-sans)]",
                        style === s
                          ? "bg-cracked-orange text-white border-cracked-orange"
                          : "bg-white text-cracked-muted border-neutral-200"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Sort + Price row */}
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="w-full appearance-none bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold text-cracked-dark font-[family-name:var(--font-dm-sans)] outline-none"
                    >
                      {SORT_OPTIONS.map((o) => (
                        <option key={o.key} value={o.key}>{o.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cracked-muted pointer-events-none" />
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-[10px] text-cracked-muted font-[family-name:var(--font-dm-sans)] shrink-0">
                      Max ${maxPrice}
                    </span>
                    <input
                      type="range" min={3} max={50} value={maxPrice}
                      onChange={(e) => setMaxPrice(+e.target.value)}
                      className="flex-1 accent-cracked-orange"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Result count */}
        <p className="text-[11px] text-cracked-muted mt-2 font-[family-name:var(--font-dm-sans)]">
          {isPending ? "Filtering…" : `${filtered.length} of ${products.length} products`}
        </p>
      </div>

      {/* ── Product Grid ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <p className="text-4xl mb-3">🧊</p>
          <p className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark">
            Nothing cracking here
          </p>
          <p className="text-sm text-cracked-muted mt-1 font-[family-name:var(--font-dm-sans)]">
            Try different filters
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <Link href={`/product/${p.id}`}>
                <motion.div
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-neutral-50 flex items-center justify-center overflow-hidden">
                    {p.thumbnail_url ? (
                      <Image
                        src={p.thumbnail_url}
                        alt={p.name}
                        fill
                        className="object-contain p-3"
                        sizes="(max-width: 640px) 50vw, 25vw"
                      />
                    ) : (
                      <span className="text-[10px] text-neutral-300 text-center px-2 font-[family-name:var(--font-dm-sans)]">
                        {p.name}
                      </span>
                    )}
                    {p.style && (
                      <span className="absolute top-2 left-2 text-[9px] font-black uppercase tracking-wide bg-cracked-dark/80 text-white px-2 py-0.5 rounded-lg">
                        {p.style}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3 space-y-1.5">
                    <p className="text-[9px] uppercase tracking-widest text-cracked-muted font-[family-name:var(--font-dm-sans)] truncate">
                      {p.brand}
                    </p>
                    <p className="text-sm font-semibold text-cracked-dark line-clamp-2 leading-tight font-[family-name:var(--font-dm-sans)]">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span
                        className="font-bold text-cracked-orange"
                        style={{ fontFamily: "var(--font-jetbrains)", fontSize: 14 }}
                      >
                        {formatPrice(p.price)}
                      </span>
                      {p.abv && (
                        <span className="text-[10px] text-cracked-muted font-[family-name:var(--font-jetbrains)]">
                          {p.abv}%
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-0.5">
                        {p.tags.slice(0, 2).map((t) => (
                          <span
                            key={t}
                            className="text-[8px] font-bold uppercase tracking-wide bg-neutral-100 text-cracked-muted px-1.5 py-0.5 rounded-full"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
