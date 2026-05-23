"use client";

import { useRouter, useSearchParams } from "next/navigation";

const FILTERS = [
  { label: "ALL", value: "" },
  { label: "CIDER", value: "cider" },
  { label: "COOLER", value: "cooler" },
  { label: "SELTZER", value: "hard_seltzer" },
] as const;

export function CatalogueFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("category") ?? "";

  const handleFilter = (value: string) => {
    if (value) {
      router.push(`/browse?category=${value}`);
    } else {
      router.push("/browse");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mr-1">
        Filter:
      </span>
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilter(f.value)}
          className={`px-4 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors border ${
            active === f.value
              ? "bg-ink text-cream border-ink"
              : "bg-transparent text-ink/50 border-ink/20 hover:border-ink hover:text-ink"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
