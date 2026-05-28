import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

interface NavProps {
  active?: "index" | "catalogue";
}

export async function Nav({ active }: NavProps) {
  const user = await getUser();

  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-ink/10">
      <Link href="/" className="flex items-baseline gap-2.5">
        <span className="font-display text-2xl tracking-tight text-ink">Cracked.</span>
        <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40">
          RTD · ON
        </span>
      </Link>

      <div className="flex items-center gap-6 md:gap-8">
        <Link
          href="/"
          className={`font-mono text-[11px] tracking-widest uppercase transition-colors ${
            active === "index"
              ? "text-ink underline underline-offset-4 decoration-1"
              : "text-ink/50 hover:text-ink"
          }`}
        >
          Index
        </Link>
        <Link
          href="/browse"
          className={`font-mono text-[11px] tracking-widest uppercase transition-colors ${
            active === "catalogue"
              ? "text-ink underline underline-offset-4 decoration-1"
              : "text-ink/50 hover:text-ink"
          }`}
        >
          Catalogue
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden md:block font-mono text-[10px] uppercase tracking-widest text-ink/40 truncate max-w-[120px]">
              {user.user_metadata?.handle ?? user.email?.split("@")[0]}
            </span>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-1.5 border border-ink/25 text-ink font-mono text-[11px] tracking-widest uppercase hover:bg-ink hover:text-cream transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="px-4 py-1.5 bg-ink text-cream font-mono text-[11px] tracking-widest uppercase hover:bg-ink/80 transition-colors"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
