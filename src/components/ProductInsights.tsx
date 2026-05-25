// Server component — no "use client"

const CATEGORY_DESC: Record<string, string> = {
  hard_seltzer: "Hard Seltzer",
  cooler:        "Cooler / Spirit Cooler",
  cider:         "Hard Cider",
  radler:        "Radler",
  other:         "RTD Beverage",
};

const CATEGORY_BASE: Record<string, string> = {
  hard_seltzer: "Carbonated water + alcohol",
  cooler:        "Malt or spirit base",
  cider:         "Fermented apple juice",
  radler:        "Beer + citrus blend",
  other:         "Ready-to-drink",
};

function abvContext(abv: number | null): string {
  if (!abv) return "—";
  if (abv <= 4) return `${abv}% · Session`;
  if (abv < 6)  return `${abv}% · Light`;
  if (abv < 9)  return `${abv}% · Medium`;
  return `${abv}% · Strong`;
}

function containerType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bottle") || n.includes("btl"))        return "Glass Bottle";
  if (n.match(/\d+\s*x\s*\d+/) || n.includes("pack"))  return "Multi-Pack Can";
  return "Single Can";
}

interface Props {
  name:                string;
  normalized_category: string;
  abv:                 number | null;
  lcbo_id:             string | null;
  price_cents:         number | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center py-3.5 border-b border-ink/8 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-ink/35 w-28 shrink-0">
        {label}
      </span>
      <span className="font-sans text-sm text-ink">{value}</span>
    </div>
  );
}

export function ProductInsights({
  name,
  normalized_category,
  abv,
  lcbo_id,
  price_cents,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-vermilion mb-3">
          Origin &amp; Insights
        </p>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink">
          About this drink
        </h2>
      </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {/* ── Insights list ── */}
      <div className="border border-ink/10 px-5 py-1">
        <Row label="Province"  value="Ontario, Canada 🇨🇦" />
        <Row label="Category"  value={CATEGORY_DESC[normalized_category] ?? normalized_category} />
        <Row label="Base"      value={CATEGORY_BASE[normalized_category] ?? "—"} />
        <Row label="Alcohol"   value={abvContext(abv)} />
        <Row label="Container" value={containerType(name)} />
        {lcbo_id    && <Row label="LCBO ID"    value={`#${lcbo_id}`} />}
        {price_cents && <Row label="LCBO Price" value={`$${(price_cents / 100).toFixed(2)} CAD`} />}
      </div>

      {/* ── Serving tips ── */}
      <div className="border border-ink/10 px-5 py-5 flex flex-col gap-4">
        <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35">Best served</p>
        <div className="flex flex-col gap-4">
          {[
            { label: "Ice cold",       sub: "Recommended 2–4°C" },
            { label: "Over ice",       sub: "For a longer drink" },
            { label: "With company",   sub: "That's the whole point" },
          ].map((tip) => (
            <div key={tip.label} className="flex items-start gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-lime shrink-0 mt-[5px]" />
              <div>
                <p className="font-sans text-sm text-ink">{tip.label}</p>
                <p className="font-mono text-[9px] text-ink/35 tracking-wide">{tip.sub}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-4 border-t border-ink/10">
          <p className="font-mono text-[9px] text-ink/25 uppercase tracking-widest">
            All products sourced from LCBO · Ontario
          </p>
        </div>
      </div>
    </div>
    </div>
  );
}
