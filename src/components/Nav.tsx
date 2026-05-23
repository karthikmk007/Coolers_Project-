import Link from "next/link";

interface NavProps {
  active?: "index" | "catalogue";
}

export function Nav({ active }: NavProps) {
  return (
    <nav className="flex items-center justify-between px-6 md:px-12 py-4 border-b border-ink/10">
      <Link href="/" className="flex items-baseline gap-2.5">
        <span className="font-display text-2xl tracking-tight text-ink">Cracked.</span>
        <span className="font-mono text-[10px] tracking-widest uppercase text-ink/40">
          RTD · ON
        </span>
      </Link>

      <div className="flex items-center gap-8">
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
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-1.5 bg-ink text-cream font-mono text-[11px] tracking-widest uppercase hover:bg-ink/80 transition-colors"
        >
          Source ↗
        </a>
      </div>
    </nav>
  );
}
