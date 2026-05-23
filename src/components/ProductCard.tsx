import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["product"]["Row"] & {
  brand?: { name: string } | null;
};

/**
 * Category → tile color system.
 * Used for both the image-less colored tile AND the label accent
 * colour shown on image cards.
 */
const CATEGORY_TILE: Record<
  string,
  { bg: string; text: string; label: string; stamp: string; accent: string }
> = {
  hard_seltzer: {
    bg: "bg-lime",
    text: "text-ink",
    label: "Seltzer",
    stamp: "text-ink/30",
    accent: "text-lime bg-lime/10",
  },
  cooler: {
    bg: "bg-vermilion",
    text: "text-cream",
    label: "Cooler",
    stamp: "text-cream/30",
    accent: "text-vermilion bg-vermilion/10",
  },
  cider: {
    bg: "bg-amber",
    text: "text-cream",
    label: "Cider",
    stamp: "text-cream/30",
    accent: "text-amber bg-amber/10",
  },
  radler: {
    bg: "bg-lime-dim",
    text: "text-ink",
    label: "Radler",
    stamp: "text-ink/30",
    accent: "text-lime-dim bg-lime-dim/10",
  },
  other: {
    bg: "bg-ink",
    text: "text-cream",
    label: "RTD",
    stamp: "text-cream/30",
    accent: "text-ink/60 bg-ink/10",
  },
};

/** Strip volume/pack suffixes for cleaner tile display */
function cleanName(name: string): string {
  return name
    .replace(/\s+\d+\s*m[lL]/g, "")
    .replace(/\s+\d+\s*pack/gi, "")
    .trim();
}

export function ProductCard({ product }: { product: Product }) {
  const brandName = product.brand?.name ?? "—";
  const formattedPrice = product.price_cents
    ? `$${(product.price_cents / 100).toFixed(2)}`
    : "—";
  const tile = CATEGORY_TILE[product.normalized_category] ?? CATEGORY_TILE.other;
  const displayName = cleanName(product.name);

  return (
    <Link href={`/products/${product.id}`} className="group flex flex-col">

      {product.image_url ? (
        /* ── Image tile — with onError fallback to colored tile ─ */
        <ProductImage
          src={product.image_url}
          alt={displayName}
          label={tile.label}
          accent={tile.accent}
          fallbackBg={tile.bg}
          fallbackText={tile.text}
          fallbackStamp={tile.stamp}
        />
      ) : (
        /* ── Colored tile (no image fallback) ────────────────── */
        <div className={`aspect-[3/4] flex flex-col justify-between p-5 ${tile.bg} transition-opacity duration-200 group-hover:opacity-90`}>
          <span className={`font-mono text-[10px] tracking-widest uppercase ${tile.text} opacity-80`}>
            {tile.label}
          </span>
          <div>
            <h3 className={`font-display text-xl leading-tight ${tile.text} mb-3 line-clamp-4`}>
              {displayName}
            </h3>
            <p className={`font-mono text-[9px] tracking-widest uppercase ${tile.stamp}`}>
              CRACKED · CA
            </p>
          </div>
        </div>
      )}

      {/* ── Info Strip ─────────────────────────────────────────── */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-sans text-sm leading-snug text-ink group-hover:text-vermilion transition-colors line-clamp-2">
            {product.name}
          </p>
          <p className="font-mono text-[10px] tracking-widest uppercase text-ink/40 mt-0.5">
            {brandName}
          </p>
        </div>
        <div className="text-right flex-shrink-0 font-mono text-xs text-ink/60 leading-relaxed">
          {product.abv != null && <div>{product.abv}%</div>}
          <div className="text-ink">{formattedPrice}</div>
        </div>
      </div>
    </Link>
  );
}
