"use client";

import { ScoreCircle }      from "@/components/product/ScoreCircle";
import { TasteSliders }     from "@/components/product/TasteSliders";
import { CrowdNotes, notesFromFlavors } from "@/components/product/CrowdNotes";
import { RatingHistogram }  from "@/components/product/RatingHistogram";
import { RatingInput }      from "@/components/rating/RatingInput";
import { VibeCheck }        from "@/components/onboarding/VibeCheck";

const DEMO_COUNTS = { 5: 112, 4: 63, 3: 18, 2: 6, 1: 3 };
const DEMO_TOTAL  = 202;
const DEMO_AVG    = 4.3;
const DEMO_FLAVORS = ["Lemon zest", "Fresh lime", "Crisp apple", "Passionfruit", "Ripe mango", "Raspberry"];
const DEMO_NOTES  = notesFromFlavors(DEMO_FLAVORS);

export default function ComponentsPreview() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-32 space-y-10 px-4 pt-8">

      <h1 className="font-[family-name:var(--font-bebas-neue)] text-4xl text-cracked-dark">
        Gate 2 — Component Preview
      </h1>

      {/* C1: ScoreCircle */}
      <section className="bg-white rounded-2xl p-6 space-y-4">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark">C1 — ScoreCircle</h2>
        <div className="flex items-center gap-8">
          <div className="text-center space-y-1">
            <ScoreCircle score={4.7} size="lg" />
            <p className="text-xs text-cracked-muted">lg · 4.7 (green)</p>
          </div>
          <div className="text-center space-y-1">
            <ScoreCircle score={3.8} size="md" />
            <p className="text-xs text-cracked-muted">md · 3.8 (amber)</p>
          </div>
          <div className="text-center space-y-1">
            <ScoreCircle score={2.9} size="sm" />
            <p className="text-xs text-cracked-muted">sm · 2.9 (red)</p>
          </div>
        </div>
      </section>

      {/* C2: TasteSliders */}
      <section className="bg-white rounded-2xl p-6">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark mb-4">C2 — TasteSliders</h2>
        <TasteSliders sweet={72} bold={38} carb={85} userSweet={55} userBold={60} editable={true} />
      </section>

      {/* C3: CrowdNotes */}
      <section className="bg-white rounded-2xl py-6">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark mb-4 px-6">C3 — CrowdNotes</h2>
        <CrowdNotes notes={DEMO_NOTES} />
      </section>

      {/* C4: RatingHistogram */}
      <section className="bg-white rounded-2xl p-6">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark mb-4">C4 — RatingHistogram</h2>
        <RatingHistogram counts={DEMO_COUNTS} total={DEMO_TOTAL} avgScore={DEMO_AVG} />
      </section>

      {/* C5: RatingInput */}
      <section className="bg-white rounded-2xl p-6 space-y-4">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark">C5 — RatingInput</h2>
        <p className="text-sm text-cracked-muted font-[family-name:var(--font-dm-sans)]">Tap a ⚡ to rate:</p>
        <RatingInput productId="demo-product-001" />
      </section>

      {/* C8: VibeCheck (inline, no redirect) */}
      <section className="bg-white rounded-2xl overflow-hidden">
        <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark px-6 pt-6 pb-2">C8 — VibeCheck</h2>
        <VibeCheck onComplete={(prefs) => console.log("prefs:", prefs)} />
      </section>
    </div>
  );
}
