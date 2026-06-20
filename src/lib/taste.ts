/**
 * CRACKED — Deterministic taste & nutrition model.
 *
 * Single source of truth for the taste profile shown across the app.
 * Pure, dependency-free (no React, no `@/` aliases) so it can be imported
 * by both Next.js Server Components and the Node seed script (`scripts/seed-products.ts`).
 *
 * Everything here is a transparent rule-based ESTIMATE derived from a product's
 * name, style and ABV — never presented as lab-verified fact.
 */

export type CategoryKey =
  | "hard_seltzer"
  | "cooler"
  | "cider"
  | "radler"
  | "cocktail"
  | "other";

export interface DerivedTaste {
  sweet: number;        // 0–100  (Dry → Sweet)
  bold: number;         // 0–100  (Light → Heavy)
  carb: number;         // 0–100  (Flat → Fizzy)
  kcal: number;         // estimated calories per serving
  sugar_g: number;      // estimated grams of sugar per serving
  servingMl: number;    // serving basis used for kcal/sugar
  flavorNotes: string[];
  pairsWith: string[];
}

const SERVING_ML = 355; // standard single-serve can

// ── Category baselines ────────────────────────────────────────────
const SWEET_BASE: Record<CategoryKey, number> = {
  hard_seltzer: 25, cooler: 55, cider: 68, radler: 58, cocktail: 48, other: 42,
};
const CARB_BASE: Record<CategoryKey, number> = {
  hard_seltzer: 90, cooler: 78, cider: 55, radler: 70, cocktail: 60, other: 72,
};
const BODY_OFFSET: Record<CategoryKey, number> = {
  hard_seltzer: -8, cooler: 0, cider: 6, radler: -4, cocktail: 12, other: 0,
};
const PAIRS: Record<CategoryKey, string[]> = {
  hard_seltzer: ["Tacos", "Ceviche", "Beach day", "Grilled shrimp"],
  cooler:       ["BBQ ribs", "Nachos", "Pool party", "Spicy wings"],
  cider:        ["Roast pork", "Sharp cheddar", "Apple pie", "Charcuterie"],
  radler:       ["Soft pretzels", "Bratwurst", "Picnic", "Summer salad"],
  cocktail:     ["Sushi", "Cheese board", "Game night", "Citrus dessert"],
  other:        ["Burgers", "Patio snacks", "Movie night", "Fresh fruit"],
};
const FLAVOR_FALLBACK: Record<CategoryKey, string[]> = {
  hard_seltzer: ["Clean", "Crisp Soda"],
  cooler:       ["Fruit Punch", "Easy-Drinking"],
  cider:        ["Orchard Apple", "Crisp"],
  radler:       ["Citrus", "Bright"],
  cocktail:     ["Mixed", "Balanced"],
  other:        ["Fruit", "Refreshing"],
};

// Flavour terms scanned in product names (longest first so "black cherry"
// wins over "cherry"). Some map to a nicer display label.
const FLAVOR_TERMS: { term: string; label: string }[] = [
  { term: "passionfruit", label: "Passionfruit" },
  { term: "black cherry", label: "Black Cherry" },
  { term: "blackberry",   label: "Blackberry" },
  { term: "blueberry",    label: "Blueberry" },
  { term: "grapefruit",   label: "Grapefruit" },
  { term: "watermelon",   label: "Watermelon" },
  { term: "strawberry",   label: "Strawberry" },
  { term: "pineapple",    label: "Pineapple" },
  { term: "cranberry",    label: "Cranberry" },
  { term: "raspberry",    label: "Raspberry" },
  { term: "clamato",      label: "Clamato" },
  { term: "coconut",      label: "Coconut" },
  { term: "tropical",     label: "Tropical" },
  { term: "passion",      label: "Passionfruit" },
  { term: "lemonade",     label: "Lemonade" },
  { term: "mango",        label: "Mango" },
  { term: "peach",        label: "Peach" },
  { term: "cherry",       label: "Cherry" },
  { term: "citrus",       label: "Citrus" },
  { term: "orange",       label: "Orange" },
  { term: "grape",        label: "Grape" },
  { term: "apple",        label: "Apple" },
  { term: "guava",        label: "Guava" },
  { term: "melon",        label: "Melon" },
  { term: "berry",        label: "Mixed Berry" },
  { term: "lime",         label: "Lime" },
  { term: "lemon",        label: "Lemon" },
  { term: "pear",         label: "Pear" },
];

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Normalize any style string OR legacy normalized_category into a CategoryKey. */
export function categoryKey(styleOrCategory: string | null | undefined): CategoryKey {
  const s = (styleOrCategory ?? "").toLowerCase();
  if (s.includes("seltzer")) return "hard_seltzer";
  if (s.includes("cider")) return "cider";
  if (s.includes("radler")) return "radler";
  if (/cocktail|vodka|gin|\brum\b|tequila|margarita|mojito|paloma|spritz|sangria|caesar/.test(s))
    return "cocktail";
  if (/cooler|lemonade|punch|tea/.test(s)) return "cooler";
  if (s === "other") return "other";
  return "other";
}

/** Extract up to 3 title-cased flavour notes from a product name. */
export function flavorNotesFromName(name: string, key: CategoryKey): string[] {
  const n = name.toLowerCase();
  const labels: string[] = [];
  const terms: string[] = [];
  for (const { term, label } of FLAVOR_TERMS) {
    // Skip if this term overlaps one already matched (e.g. "cherry" after "black cherry").
    if (!n.includes(term)) continue;
    if (labels.includes(label)) continue;
    if (terms.some((t) => t.includes(term) || term.includes(t))) continue;
    labels.push(label);
    terms.push(term);
    if (labels.length >= 3) break;
  }
  return labels.length > 0 ? labels : FLAVOR_FALLBACK[key];
}

/**
 * Map a product to a canonical Shop style label. The returned value is always
 * one of the Shop filter options so filtering works:
 * "Hard Seltzer" | "Cider" | "Hard Cider" | "RTD Cocktail" | "Cooler" | "Hard Tea" | "Radler" | "Caesar"
 */
export function styleLabel(name: string, normalizedCategory?: string | null): string {
  const n = name.toLowerCase();
  if (/caesar|clamato/.test(n)) return "Caesar";
  if (/\btea\b/.test(n)) return "Hard Tea";
  if (/cider/.test(n)) return n.includes("hard") ? "Hard Cider" : "Cider";
  if (/radler/.test(n)) return "Radler";
  if (/cocktail|vodka|\bgin\b|\brum\b|tequila|margarita|mojito|paloma|cosmo|spritz|sangria/.test(n))
    return "RTD Cocktail";
  if (/seltzer/.test(n)) return "Hard Seltzer";
  if (/lemonade|punch|cooler/.test(n)) return "Cooler";

  switch ((normalizedCategory ?? "").toLowerCase()) {
    case "hard_seltzer": return "Hard Seltzer";
    case "cider":        return "Cider";
    case "radler":       return "Radler";
    case "cooler":       return "Cooler";
    default:             return "RTD Cocktail";
  }
}

/** Derive the full taste + nutrition estimate for a product. */
export function deriveTaste(
  name: string,
  styleOrCategory: string | null | undefined,
  abv: number | null | undefined,
): DerivedTaste {
  const n = name.toLowerCase();
  const a = abv ?? 5;
  const key = categoryKey(styleOrCategory);

  // ── Sweetness ──
  let sweet = SWEET_BASE[key];
  if (/sweet|honey|sugar|lemonade|punch|sangria|dessert/.test(n)) sweet += 18;
  if (/\bdry\b|brut|natural|zero|no sugar|unsweet|soda|light/.test(n)) sweet -= 16;
  if (/sour|tart|lime|grapefruit/.test(n)) sweet -= 6;
  sweet = clamp(Math.round(sweet), 5, 95);

  // ── Carbonation ──
  let carb = CARB_BASE[key];
  if (/sparkling|soda|spritz|fizz/.test(n)) carb += 8;
  if (/still|flat|smooth|cream|slush/.test(n)) carb -= 18;
  carb = clamp(Math.round(carb), 10, 98);

  // ── Body / boldness (driven by ABV) ──
  const bold = clamp(Math.round(a * 8 + BODY_OFFSET[key] + 8), 10, 95);

  // ── Nutrition estimates (per 355 mL) ──
  const sugar_g = Math.round(Math.pow(sweet / 100, 1.4) * 26 * 10) / 10;
  const alcoholKcal = (a / 100) * SERVING_ML * 0.789 * 7; // 0.789 g/mL ethanol, 7 kcal/g
  const kcal = Math.round(alcoholKcal + sugar_g * 4);

  return {
    sweet,
    bold,
    carb,
    kcal,
    sugar_g,
    servingMl: SERVING_ML,
    flavorNotes: flavorNotesFromName(name, key),
    pairsWith: PAIRS[key],
  };
}

/** Short editorial blurb used when a product has no stored description. */
export function productBlurb(
  brand: string,
  style: string,
  abv: number | null | undefined,
  flavorNotes: string[],
): string {
  const strength =
    abv == null ? "" :
    abv <= 4 ? "session-strength " :
    abv <= 6 ? "easy-drinking " :
    abv <= 9 ? "medium-bodied " : "full-strength ";
  const flavorPart =
    flavorNotes.length >= 2 ? `${flavorNotes[0]} and ${flavorNotes[1]}` :
    flavorNotes.length === 1 ? `${flavorNotes[0]}` : "clean, crisp";
  return (
    `A ${strength}${style.toLowerCase()} from ${brand}, leaning ${flavorPart.toLowerCase()}. ` +
    `Sourced from LCBO Ontario and indexed for the CRACKED catalogue.`
  );
}
