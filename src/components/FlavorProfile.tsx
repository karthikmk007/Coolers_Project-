// Server component

// ── Flavour database ─────────────────────────────────────────────────────────

type FlavorEntry = {
  emoji:    string;
  display:  string;  // formatted title e.g. "Watermelon, Melon Rind"
  tags:     string[];
  mentions: number;
  bg:       string;
  border:   string;
};

const FLAVOR_DB: Record<string, FlavorEntry> = {
  "watermelon": {
    emoji: "🍉", display: "Watermelon, Melon Rind",
    tags: ["Aqueous Cucumber Melon", "Watermelon seed juice"],
    mentions: 612, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "raspberry": {
    emoji: "🫐", display: "Raspberry, Wild Berry",
    tags: ["Tart botanical", "Wild red berry"],
    mentions: 723, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "mango": {
    emoji: "🥭", display: "Mango, Stone Fruit",
    tags: ["Alphonso tropical", "Stone fruit pulp"],
    mentions: 847, bg: "bg-amber/8", border: "border-amber/20",
  },
  "lime": {
    emoji: "🍋", display: "Lime, Citrus Zest",
    tags: ["Persian citrus", "Zest & pith"],
    mentions: 1204, bg: "bg-lime/10", border: "border-lime/30",
  },
  "natural lime": {
    emoji: "🍋", display: "Natural Lime, Clean Citrus",
    tags: ["Persian citrus", "Clean acid note"],
    mentions: 891, bg: "bg-lime/10", border: "border-lime/30",
  },
  "lemon": {
    emoji: "🍋", display: "Lemon, Bright Citrus",
    tags: ["Eureka citrus", "Citric acid note"],
    mentions: 891, bg: "bg-amber/8", border: "border-amber/20",
  },
  "black cherry": {
    emoji: "🍒", display: "Black Cherry, Stone Fruit",
    tags: ["Dark bing cherry", "Stone fruit tannin"],
    mentions: 389, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "cherry": {
    emoji: "🍒", display: "Cherry, Stone Fruit",
    tags: ["Bing cherry flesh", "Sweet stone fruit"],
    mentions: 445, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "strawberry": {
    emoji: "🍓", display: "Strawberry, Garden Berry",
    tags: ["Jammy garden berry", "Sweet floral finish"],
    mentions: 534, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "peach": {
    emoji: "🍑", display: "Peach, White Stone Fruit",
    tags: ["White peach flesh", "Stone fruit bloom"],
    mentions: 367, bg: "bg-amber/8", border: "border-amber/20",
  },
  "grapefruit": {
    emoji: "🍊", display: "Grapefruit, Bitter Citrus",
    tags: ["Pink bitter citrus", "Pith & white zest"],
    mentions: 298, bg: "bg-amber/8", border: "border-amber/20",
  },
  "pineapple": {
    emoji: "🍍", display: "Pineapple, Tropical",
    tags: ["Bromelain tropical", "Caramelised crown"],
    mentions: 445, bg: "bg-amber/8", border: "border-amber/20",
  },
  "cranberry": {
    emoji: "🔴", display: "Cranberry, Tart Berry",
    tags: ["Tart red berry", "Astringent finish"],
    mentions: 312, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "passion": {
    emoji: "💛", display: "Passionfruit, Exotic Tropical",
    tags: ["Maracuja tropical", "Tartaric acid"],
    mentions: 287, bg: "bg-amber/8", border: "border-amber/20",
  },
  "tropical": {
    emoji: "🌴", display: "Tropical, Mixed Fruit",
    tags: ["Guava-mango blend", "Passionfruit trace"],
    mentions: 567, bg: "bg-amber/8", border: "border-amber/20",
  },
  "citrus": {
    emoji: "🍊", display: "Citrus, Bright Acid",
    tags: ["Lemon-lime compound", "Citric brightness"],
    mentions: 634, bg: "bg-lime/10", border: "border-lime/30",
  },
  "grape": {
    emoji: "🍇", display: "Grape, Vineyard Fruit",
    tags: ["Concord varietal", "Musty sweet finish"],
    mentions: 234, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "clamato": {
    emoji: "🍅", display: "Clamato, Savoury Brine",
    tags: ["Tomato-clam brine", "Umami salt note"],
    mentions: 45, bg: "bg-vermilion/5", border: "border-vermilion/20",
  },
  "coconut": {
    emoji: "🥥", display: "Coconut, Creamy Tropical",
    tags: ["Toasted coconut fiber", "Creamy finish"],
    mentions: 198, bg: "bg-ink/5", border: "border-ink/15",
  },
  "apple": {
    emoji: "🍎", display: "Apple, Crisp Orchard",
    tags: ["Granny Smith orchard", "Malic acid note"],
    mentions: 567, bg: "bg-lime/10", border: "border-lime/30",
  },
};

const SORTED_KEYS = Object.keys(FLAVOR_DB).sort((a, b) => b.length - a.length);

export function extractFlavors(name: string): string[] {
  const lower = name.toLowerCase();
  const found: string[] = [];
  for (const key of SORTED_KEYS) {
    if (lower.includes(key) && !found.some((f) => key.includes(f) || f.includes(key))) {
      found.push(key);
    }
  }
  return found.slice(0, 3);
}

const CATEGORY_NOUN: Record<string, string> = {
  hard_seltzer: "seltzer",
  cooler:        "cooler",
  cider:         "cider",
  radler:        "radler",
  other:         "RTD",
};

interface Props {
  name:     string;
  category: string;
}

export function FlavorProfile({ name, category }: Props) {
  const flavors = extractFlavors(name);
  const primary = flavors[0] ? FLAVOR_DB[flavors[0]] : null;
  const extra   = flavors.slice(1).map((k) => FLAVOR_DB[k]).filter(Boolean);
  const noun    = CATEGORY_NOUN[category] ?? "drink";

  return (
    <div className="space-y-6">
      {/* ── Section header ── */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-vermilion mb-3">
          Crowdsourced Paraphernalia
        </p>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink">
          How does this {noun} taste?
        </h2>
      </div>

      {primary ? (
        <div className={`border ${primary.border} ${primary.bg} p-5 md:p-6`}>
          {/* Top row: emoji + mentions badge */}
          <div className="flex items-start justify-between mb-4">
            <span className="text-3xl">{primary.emoji}</span>
            <span className="font-mono text-[9px] uppercase tracking-widest text-ink/50 border border-ink/15 px-2 py-1">
              {primary.mentions.toLocaleString()} mentions
            </span>
          </div>
          {/* Flavour name */}
          <p className="font-display text-xl md:text-2xl text-ink mb-3">
            {primary.display}
            {extra.map((e) => e && `, ${e.display.split(",")[0]}`).join("")}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {[...primary.tags, ...extra.flatMap((e) => (e ? [e.tags[0]] : []))].map((tag) => (
              <span
                key={tag}
                className="font-mono text-[9px] uppercase tracking-widest text-ink/60 border border-ink/15 px-2.5 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="border border-ink/10 p-6 font-mono text-[10px] text-ink/40 uppercase tracking-widest">
          Flavour profile not detected — clean & unflavoured
        </div>
      )}
    </div>
  );
}
