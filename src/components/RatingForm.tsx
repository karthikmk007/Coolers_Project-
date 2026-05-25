"use client";

import { useActionState, useState } from "react";
import { submitReview } from "@/app/actions/review";

function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hover, setHover] = useState(0);
  const display = hover || value;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          aria-label={`${n} star${n !== 1 ? "s" : ""}`}
          className={`text-2xl leading-none transition-colors ${
            n <= display ? "text-vermilion" : "text-ink/15"
          }`}
        >
          ★
        </button>
      ))}
      <span className="ml-3 font-mono text-[11px] text-ink/50 tracking-widest">
        {value} / 5
      </span>
    </div>
  );
}

export function RatingForm({ productId }: { productId: number }) {
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(submitReview, null);

  if (state?.success) {
    return (
      <div className="border border-lime/40 bg-lime/8 px-6 py-5 flex items-start gap-3">
        <span className="text-lime text-xl leading-none mt-0.5">●</span>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink">
            Verdict logged.
          </p>
          <p className="font-mono text-[10px] text-ink/40 mt-1">
            Your rating has been added to the analytics pipeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border border-ink/15 p-5 md:p-7">
      {/* Form header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-vermilion text-sm">✦</span>
        <h3 className="font-display text-xl md:text-2xl text-ink">
          Rate this bottle for science
        </h3>
      </div>

      <form action={action} className="space-y-5">
        <input type="hidden" name="product_id" value={productId} />
        <input type="hidden" name="rating"     value={rating} />

        {/* Row 1: tag/handle + star assessment side by side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
              Your Tag / Handle
            </label>
            <input
              name="author_name"
              type="text"
              placeholder="e.g. TorontoML_Recruiter"
              className="w-full border border-ink/20 bg-transparent px-4 py-2.5 font-mono text-[11px] text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
              Star Assessment
            </label>
            <div className="border border-ink/20 px-4 py-2.5 flex items-center">
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>
        </div>

        {/* Row 2: flavor observations textarea */}
        <div>
          <label className="font-mono text-[9px] uppercase tracking-widest text-ink/40 block mb-2">
            Qualitative Flavour Observations{" "}
            <span className="text-ink/25">(optional)</span>
          </label>
          <textarea
            name="body"
            rows={3}
            placeholder="Rate carbonation tightness, aftertaste sweet spikes, and botanical traces…"
            className="w-full border border-ink/20 bg-transparent px-4 py-3 font-sans text-sm text-ink placeholder:text-ink/25 focus:outline-none focus:border-ink transition-colors resize-none"
          />
        </div>

        {state?.error && (
          <p className="font-mono text-[10px] text-vermilion tracking-wide">
            {state.error}
          </p>
        )}

        {/* CTA */}
        <button
          type="submit"
          disabled={pending || rating === 0}
          className="w-full py-3.5 bg-lime text-ink font-mono text-[11px] font-bold tracking-widest uppercase hover:bg-lime/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "Submitting…" : "Submit Verdict for Analytics →"}
        </button>
      </form>
    </div>
  );
}
