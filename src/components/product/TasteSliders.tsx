"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface TasteValues {
  sweet: number;  // 0–100
  bold:  number;
  carb:  number;
}

interface TasteSlidersProps {
  sweet:      number;
  bold:       number;
  carb:       number;
  userSweet?: number;
  userBold?:  number;
  userCarb?:  number;
  editable?:  boolean;
  onSave?:    (v: TasteValues) => Promise<void>;
}

const SLIDERS = [
  { key: "sweet" as const, left: "Dry",   right: "Sweet", emoji: "🍬" },
  { key: "bold"  as const, left: "Light", right: "Heavy", emoji: "💪" },
  { key: "carb"  as const, left: "Flat",  right: "Fizzy", emoji: "🫧" },
];

export function TasteSliders({
  sweet, bold, carb,
  userSweet, userBold, userCarb,
  editable = false,
  onSave,
}: TasteSlidersProps) {
  const [editing, setEditing]   = useState(false);
  const [saving,  setSaving]    = useState(false);
  const [draft,   setDraft]     = useState<TasteValues>({ sweet, bold, carb });

  const defaults = { sweet, bold, carb };
  const userVals = {
    sweet: userSweet ?? null,
    bold:  userBold  ?? null,
    carb:  userCarb  ?? null,
  };

  async function handleSave() {
    if (!onSave) { setEditing(false); return; }
    setSaving(true);
    try   { await onSave(draft); }
    finally { setSaving(false); setEditing(false); }
  }

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h3 className="font-[family-name:var(--font-bebas-neue)] text-xl text-cracked-dark">
          Flavor Profile
        </h3>
        {editable && !editing && (
          <button
            onClick={() => { setDraft(defaults); setEditing(true); }}
            className="flex items-center gap-1 text-cracked-orange text-xs font-semibold"
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        )}
        {editing && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 bg-cracked-orange text-white text-xs font-bold px-3 py-1 rounded-xl"
          >
            <Check className="w-3 h-3" />
            {saving ? "Saving…" : "Save"}
          </button>
        )}
      </div>

      {/* Sliders */}
      {SLIDERS.map(({ key, left, right, emoji }) => {
        const baseVal = editing ? draft[key] : defaults[key];
        const userVal = userVals[key];

        return (
          <div key={key} className="space-y-1.5">
            {/* Labels */}
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-medium text-cracked-muted font-[family-name:var(--font-dm-sans)]">
                {emoji} {left}
              </span>
              <span className="font-[family-name:var(--font-jetbrains)] text-[11px] text-cracked-dark font-bold">
                {baseVal}
              </span>
              <span className="text-[11px] font-medium text-cracked-muted font-[family-name:var(--font-dm-sans)]">
                {right}
              </span>
            </div>

            {/* Track */}
            <div className="relative h-4 flex items-center">
              {/* Base track */}
              <div className="absolute inset-x-0 h-1.5 rounded-full bg-neutral-200" />

              {/* Filled portion */}
              <div
                className="absolute left-0 h-1.5 rounded-full bg-cracked-orange transition-all duration-150"
                style={{ width: `${baseVal}%` }}
              />

              {/* User override dashed indicator */}
              {userVal !== null && !editing && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 border-l-2 border-dashed border-cracked-lime"
                  style={{ left: `${userVal}%` }}
                />
              )}

              {/* Thumb */}
              {editing ? (
                <input
                  type="range"
                  min={0} max={100} step={1}
                  value={draft[key]}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: +e.target.value }))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer h-full z-10"
                />
              ) : null}

              <motion.div
                className={cn(
                  "absolute w-5 h-7 rounded-full bg-cracked-orange shadow-md",
                  "shadow-orange-400/50 flex items-center justify-center",
                  editing && "cursor-grab active:cursor-grabbing"
                )}
                style={{ left: `calc(${baseVal}% - 10px)` }}
                whileTap={{ scale: 1.2 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              />
            </div>
          </div>
        );
      })}

      {/* Legend */}
      {userVals.sweet !== null && !editing && (
        <div className="flex gap-4 text-[10px] font-[family-name:var(--font-dm-sans)]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded-full bg-cracked-orange inline-block" />
            Product default
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0 border-t-2 border-dashed border-cracked-lime inline-block" />
            Your taste
          </span>
        </div>
      )}
    </div>
  );
}
