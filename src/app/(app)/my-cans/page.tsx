"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { VibeCheck } from "@/components/onboarding/VibeCheck";
import { useUserStore } from "@/store/userStore";
import { createClient } from "@/lib/supabase/client";
import { ScoreCircle } from "@/components/product/ScoreCircle";
import { formatPrice } from "@/lib/utils/format";

type RatedProduct = {
  id:            string;
  name:          string;
  brand:         string;
  price:         number | null;
  thumbnail_url: string | null;
  userScore:     number;
};

export default function MyCansPage() {
  const { hasOnboarded, ratings, setOnboarded } = useUserStore();
  const [ratedProducts, setRatedProducts] = useState<RatedProduct[]>([]);
  const [loading, setLoading] = useState(false);

  const ratedIds = Object.keys(ratings);

  useEffect(() => {
    if (!hasOnboarded || ratedIds.length === 0) return;
    setLoading(true);
    createClient()
      .from("products")
      .select("id, name, brand, price, thumbnail_url")
      .in("id", ratedIds)
      .then(({ data }) => {
        setRatedProducts(
          (data ?? []).map((p) => ({
            ...(p as { id: string; name: string; brand: string; price: number | null; thumbnail_url: string | null }),
            userScore: ratings[p.id] ?? 0,
          }))
        );
        setLoading(false);
      });
  }, [hasOnboarded, ratedIds.join(",")]);

  // ── State A: Not onboarded → VibeCheck ──────────────────────
  if (!hasOnboarded) {
    return (
      <VibeCheck
        onComplete={async (prefs) => {
          // Save prefs to Supabase if logged in
          const sb = createClient();
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            await sb.from("profiles").update(prefs).eq("id", user.id);
          }
          setOnboarded(true);
        }}
      />
    );
  }

  // ── State B: Onboarded — show rated products ─────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-screen bg-cracked-cream px-4 pt-12 pb-32"
    >
      <h1
        className="text-cracked-dark mb-1"
        style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 36 }}
      >
        My Cans
      </h1>
      <p className="text-sm text-cracked-muted mb-6 font-[family-name:var(--font-dm-sans)]">
        {ratedIds.length > 0
          ? `You've cracked ${ratedIds.length} can${ratedIds.length > 1 ? "s" : ""} open`
          : "Nothing rated yet — start exploring the shop!"}
      </p>

      {ratedIds.length === 0 ? (
        <div className="flex flex-col items-center gap-5 pt-10">
          <div className="w-20 h-20 rounded-full bg-cracked-orange/10 flex items-center justify-center text-4xl">
            🍺
          </div>
          <p
            className="text-center text-cracked-dark"
            style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 24 }}
          >
            Your shelf is empty
          </p>
          <Link
            href="/shop"
            className="px-6 py-3 bg-cracked-orange text-white rounded-2xl font-bold uppercase tracking-widest text-sm font-[family-name:var(--font-dm-sans)]"
          >
            Browse the Shop →
          </Link>

          {/* Reset onboarding */}
          <button
            onClick={() => setOnboarded(false)}
            className="mt-6 text-xs text-cracked-muted underline font-[family-name:var(--font-dm-sans)]"
          >
            Redo taste quiz
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3">
          {ratedIds.map((id) => (
            <div key={id} className="h-52 rounded-2xl bg-neutral-100 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            {ratedProducts
              .sort((a, b) => b.userScore - a.userScore)
              .map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link href={`/product/${p.id}`}>
                    <motion.div
                      whileTap={{ scale: 0.96 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="bg-white rounded-2xl border border-neutral-100 overflow-hidden"
                    >
                      <div className="relative h-36 bg-neutral-50">
                        {p.thumbnail_url ? (
                          <Image
                            src={p.thumbnail_url}
                            alt={p.name}
                            fill
                            className="object-contain p-3"
                            sizes="(max-width: 640px) 50vw, 25vw"
                          />
                        ) : null}
                        <div className="absolute bottom-2 right-2">
                          <ScoreCircle score={p.userScore} size="sm" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-[9px] text-cracked-muted uppercase tracking-widest font-[family-name:var(--font-dm-sans)] truncate">
                          {p.brand}
                        </p>
                        <p className="text-xs font-semibold line-clamp-2 leading-tight font-[family-name:var(--font-dm-sans)]">
                          {p.name}
                        </p>
                        <p className="text-cracked-orange text-xs font-bold font-[family-name:var(--font-jetbrains)] mt-1">
                          {formatPrice(p.price)}
                        </p>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
          </div>

          <button
            onClick={() => setOnboarded(false)}
            className="w-full mt-8 py-3 border border-neutral-200 rounded-2xl text-sm font-semibold text-cracked-muted font-[family-name:var(--font-dm-sans)]"
          >
            Redo taste quiz
          </button>
        </>
      )}
    </motion.div>
  );
}
