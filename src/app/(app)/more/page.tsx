"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  User, Heart, ShoppingBag, ScanLine, Info,
  ChevronRight, LogOut, Star
} from "lucide-react";
import { useUserStore } from "@/store/userStore";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { initials } from "@/lib/utils/format";

const NAV_GROUPS = [
  {
    title: "Your Account",
    items: [
      { href: "/my-cans", Icon: Heart,        label: "My Cans",      sub: "Your rated shelf" },
      { href: "/shop",    Icon: ShoppingBag,   label: "Shop",         sub: "Browse all 385 RTDs" },
      { href: "/scan",    Icon: ScanLine,      label: "Scan a Can",   sub: "Identify any LCBO product" },
    ],
  },
  {
    title: "Discover",
    items: [
      { href: "/home",    Icon: Star,          label: "Top Rated",    sub: "Community favourites" },
      { href: "/discover",Icon: ShoppingBag,   label: "Discover",     sub: "Filter by flavour" },
    ],
  },
  {
    title: "App",
    items: [
      { href: "#",        Icon: Info,          label: "About CRACKED", sub: "v3.0 · Ontario RTD discovery" },
    ],
  },
];

export default function MorePage() {
  const { profile, isLoggedIn, reset } = useUserStore();
  const router  = useRouter();
  const name    = profile?.display_name ?? "Guest";
  const ratingCount = Object.keys(useUserStore((s) => s.ratings)).length;

  async function handleLogout() {
    const sb = createClient();
    await sb.auth.signOut();
    reset();
    router.push("/login");
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="min-h-screen bg-cracked-cream pb-32"
    >
      {/* ── Profile card ── */}
      <div className="bg-cracked-dark px-5 pt-14 pb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-cracked-orange flex items-center justify-center text-white text-2xl font-bold"
               style={{ fontFamily: "var(--font-bebas-neue)" }}>
            {initials(name)}
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-lg leading-tight font-[family-name:var(--font-dm-sans)] truncate">
              {name}
            </p>
            {isLoggedIn ? (
              <p className="text-white/50 text-xs font-[family-name:var(--font-dm-sans)]">
                {ratingCount} can{ratingCount !== 1 ? "s" : ""} rated
              </p>
            ) : (
              <Link
                href="/login"
                className="text-cracked-orange text-xs font-bold font-[family-name:var(--font-dm-sans)]"
              >
                Sign in to sync your shelf →
              </Link>
            )}
          </div>

          {profile?.is_pro && (
            <span className="ml-auto shrink-0 text-[10px] font-black bg-cracked-orange text-white px-2 py-1 rounded-lg uppercase tracking-wide">
              PRO
            </span>
          )}
        </div>

        {/* Stats strip */}
        <div className="flex gap-6 mt-6">
          {[
            { label: "Rated",   value: ratingCount },
            { label: "Styles",  value: "6" },
            { label: "Ontario", value: "✓" },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-cracked-orange font-bold"
                 style={{ fontFamily: "var(--font-bebas-neue)", fontSize: 24 }}>
                {value}
              </p>
              <p className="text-white/40 text-[10px] uppercase tracking-widest font-[family-name:var(--font-dm-sans)]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Nav groups ── */}
      <div className="px-4 pt-5 space-y-6">
        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-[10px] uppercase tracking-widest text-cracked-muted font-bold mb-2 font-[family-name:var(--font-dm-sans)] px-1">
              {group.title}
            </p>
            <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden divide-y divide-neutral-50">
              {group.items.map(({ href, Icon, label, sub }) => (
                <Link key={label} href={href}>
                  <motion.div
                    whileTap={{ backgroundColor: "#FFF7ED" }}
                    className="flex items-center gap-3 px-4 py-4"
                  >
                    <div className="w-9 h-9 rounded-xl bg-cracked-orange/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-cracked-orange" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-cracked-dark font-[family-name:var(--font-dm-sans)]">
                        {label}
                      </p>
                      <p className="text-[11px] text-cracked-muted font-[family-name:var(--font-dm-sans)] truncate">
                        {sub}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Auth action */}
        {isLoggedIn ? (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3.5 border border-neutral-200 rounded-2xl text-sm font-semibold text-cracked-muted font-[family-name:var(--font-dm-sans)]"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </motion.button>
        ) : (
          <Link
            href="/login"
            className="block text-center py-3.5 bg-cracked-orange text-white rounded-2xl text-sm font-bold uppercase tracking-widest font-[family-name:var(--font-dm-sans)]"
          >
            Sign In →
          </Link>
        )}

        <p className="text-center text-[10px] text-cracked-muted font-[family-name:var(--font-dm-sans)] pb-4">
          CRACKED v3.0 · Ontario RTD Discovery · 385 products
        </p>
      </div>
    </motion.div>
  );
}
