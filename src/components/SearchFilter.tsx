"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { useDebounce } from "use-debounce";
import { useEffect } from "react";

const CATEGORIES = [
  { value: "", label: "All Drinks" },
  { value: "hard_seltzer", label: "Seltzers" },
  { value: "cooler", label: "Coolers" },
  { value: "cider", label: "Ciders" },
  { value: "radler", label: "Radlers" },
];

export function SearchFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const initialSearch = searchParams.get("q") || "";
  const initialCategory = searchParams.get("category") || "";

  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch] = useDebounce(search, 300);

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      return params.toString();
    },
    [searchParams]
  );

  useEffect(() => {
    if (debouncedSearch !== initialSearch) {
      router.push(`/browse?${createQueryString("q", debouncedSearch)}`);
    }
  }, [debouncedSearch, router, createQueryString, initialSearch]);

  const handleCategoryChange = (val: string) => {
    router.push(`/browse?${createQueryString("category", val)}`);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full border-b border-ink/10 pb-6 mb-8">
      <div className="flex-1 relative">
        <input
          type="text"
          placeholder="Search for something specific..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-b-2 border-ink/20 py-3 px-0 font-sans text-xl placeholder:text-ink/30 focus:outline-none focus:border-ink transition-colors rounded-none"
        />
        {/* Simple visual indicator for search input */}
        <div className="absolute right-0 bottom-3 w-2 h-2 bg-lime rounded-full" />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => handleCategoryChange(cat.value)}
            className={`px-4 py-2 font-mono text-xs tracking-wider uppercase whitespace-nowrap transition-colors border ${
              initialCategory === cat.value
                ? "bg-ink text-cream border-ink"
                : "bg-transparent text-ink/60 border-ink/20 hover:border-ink hover:text-ink"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
