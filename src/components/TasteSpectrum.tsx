// Server component — computes taste profile algorithmically from product metadata

interface Bar {
  label:       string;
  leftLabel:   string;
  rightLabel:  string;
  value:       number; // 0–100
  color:       string; // tailwind bg class
}

function compute(
  name:     string,
  category: string,
  abv:      number | null,
): Bar[] {
  const n = name.toLowerCase();
  const a = abv ?? 5;

  // ── Sweetness ─────────────────────────────────────────────
  const sweetBase: Record<string, number> = {
    hard_seltzer: 25, cooler: 52, cider: 68, radler: 58, other: 40,
  };
  let sweetness = sweetBase[category] ?? 35;
  if (n.match(/sweet|honey|sugar/))            sweetness = Math.min(95, sweetness + 22);
  if (n.match(/dry|natural|light|sparkling/)) sweetness = Math.max(5,  sweetness - 15);

  // ── Carbonation ───────────────────────────────────────────
  const carbBase: Record<string, number> = {
    hard_seltzer: 90, cooler: 78, cider: 58, radler: 70, other: 72,
  };
  const carbonation = carbBase[category] ?? 75;

  // ── Fruit Loudness ────────────────────────────────────────
  const terms = [
    "mango","raspberry","watermelon","strawberry","cherry","black cherry",
    "peach","pineapple","citrus","berry","tropical","lime","lemon",
    "grapefruit","passion","cranberry","grape","apple","coconut","clamato",
  ];
  let hits = 0;
  for (const t of terms) if (n.includes(t)) hits++;
  let fruitLoudness = hits === 0 ? 10 : Math.min(95, 18 + hits * 30);
  if (n.match(/natural|subtle|hint|plain/)) fruitLoudness = Math.max(5, fruitLoudness - 18);

  // ── Alcohol Stamp ─────────────────────────────────────────
  const alcoholStamp = Math.min(92, Math.round((a / 12) * 100));

  return [
    {
      label:      "SWEETNESS",
      leftLabel:  "BONE DRY",
      rightLabel: "SYRUPY",
      value:      Math.round(sweetness),
      color:      "bg-vermilion",
    },
    {
      label:      "CARBONATION",
      leftLabel:  "STILL/FLAT",
      rightLabel: "ULTRA FIZZ",
      value:      Math.round(carbonation),
      color:      "bg-lime",
    },
    {
      label:      "FRUIT LOUDNESS",
      leftLabel:  "SUBTLE HINT",
      rightLabel: "LOUD & PUNCHY",
      value:      Math.round(fruitLoudness),
      color:      "bg-vermilion",
    },
    {
      label:      "ALCOHOL STAMP",
      leftLabel:  "UNDETECTABLE",
      rightLabel: "WARM FINISH",
      value:      Math.round(alcoholStamp),
      color:      "bg-ink",
    },
  ];
}

interface Props {
  name:     string;
  category: string;
  abv:      number | null;
}

export function TasteSpectrum({ name, category, abv }: Props) {
  const bars = compute(name, category, abv);

  return (
    <div className="border border-ink/15 p-5 md:p-7">
      <p className="font-mono text-[9px] uppercase tracking-widest text-vermilion mb-6">
        Algorithmic Taste Spectrum
      </p>
      <div className="space-y-6">
        {bars.map((bar) => (
          <div key={bar.label}>
            {/* Axis labels */}
            <div className="flex items-end justify-between mb-1.5">
              <span className="font-mono text-[8px] uppercase tracking-widest text-ink/35">
                {bar.leftLabel}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-widest text-ink/70 font-medium">
                {bar.label}
              </span>
              <span className="font-mono text-[8px] uppercase tracking-widest text-ink/35">
                {bar.rightLabel}
              </span>
            </div>
            {/* Track */}
            <div className="relative h-2 bg-ink/8">
              {/* Fill */}
              <div
                className={`absolute inset-y-0 left-0 ${bar.color}`}
                style={{ width: `${bar.value}%` }}
              />
              {/* Thumb */}
              <div
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-5 ${bar.color}`}
                style={{ left: `${bar.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
