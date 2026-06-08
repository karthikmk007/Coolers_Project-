"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, ShoppingBag, ScanLine, Heart, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const NAV_ITEMS = [
  { href: "/home",    label: "Home",    Icon: Home },
  { href: "/shop",    label: "Shop",    Icon: ShoppingBag },
  // Scan sits in the center — rendered separately as FAB
  { href: "/my-cans", label: "My Cans", Icon: Heart },
  { href: "/more",    label: "More",    Icon: MoreHorizontal },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-t border-neutral-100 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">

        {/* Left two items */}
        {NAV_ITEMS.slice(0, 2).map(({ href, label, Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
        ))}

        {/* Center FAB — Scan */}
        <div className="relative flex flex-col items-center -mt-5">
          <motion.div whileTap={{ scale: 0.92 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Link
              href="/scan"
              className={cn(
                "w-14 h-14 rounded-full flex items-center justify-center",
                "bg-cracked-orange shadow-lg shadow-orange-300/50",
                "active:shadow-orange-400/60 transition-shadow"
              )}
              aria-label="Scan a can"
            >
              <ScanLine className="w-6 h-6 text-white" strokeWidth={2.5} />
            </Link>
          </motion.div>
          <span className="mt-1 text-[10px] font-medium text-cracked-muted">Scan</span>
        </div>

        {/* Right two items */}
        {NAV_ITEMS.slice(2).map(({ href, label, Icon }) => (
          <NavItem key={href} href={href} label={label} Icon={Icon} active={pathname === href} />
        ))}
      </div>
    </nav>
  );
}

// ── Single nav item ───────────────────────────────────────────

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
}) {
  return (
    <motion.div whileTap={{ scale: 0.88 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
      <Link href={href} className="flex flex-col items-center gap-0.5 min-w-[48px]">
        <Icon
          className={cn(
            "w-5 h-5 transition-colors",
            active ? "text-cracked-orange" : "text-cracked-muted"
          )}
          strokeWidth={active ? 2.5 : 2}
        />
        <span
          className={cn(
            "text-[10px] font-medium transition-colors",
            active ? "text-cracked-orange" : "text-cracked-muted"
          )}
        >
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="nav-indicator"
            className="absolute -top-px h-0.5 w-6 bg-cracked-orange rounded-full"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          />
        )}
      </Link>
    </motion.div>
  );
}
