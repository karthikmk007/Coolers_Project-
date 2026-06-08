/** Format price in dollars → "$4.29" */
export function formatPrice(price: number | null): string {
  if (price == null) return "—";
  return `$${price.toFixed(2)}`;
}

/** Format ABV → "5.0% ABV" */
export function formatAbv(abv: number | null): string {
  if (abv == null) return "—";
  return `${abv}% ABV`;
}

/** Format volume → "355 mL" */
export function formatVolume(ml: number | null): string {
  if (ml == null) return "—";
  return ml >= 1000 ? `${(ml / 1000).toFixed(1)} L` : `${ml} mL`;
}

/** Compact number → "1.2k" */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

/** Initials from display name → "JD" */
export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
