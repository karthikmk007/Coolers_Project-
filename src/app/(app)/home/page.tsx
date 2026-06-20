import { createSupabaseServerClient } from "@/lib/supabase-server";
import { formatPrice } from "@/lib/utils/format";
import Image from "next/image";
import Link from "next/link";

export const revalidate = 300;

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();

  const { data: topRated } = await supabase
    .from("products")
    .select("id, lcbo_id, brand, name, style, price, thumbnail_url, taste_sweet, tags")
    .order("taste_sweet", { ascending: false })
    .limit(12);

  const { data: newDrops } = await supabase
    .from("products")
    .select("id, lcbo_id, brand, name, style, price, thumbnail_url, tags")
    .order("created_at", { ascending: false })
    .limit(8);

  // Real catalogue stats for the bottom bar.
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });
  const { data: styleRows } = await supabase.from("products").select("style");
  const styleCount = new Set(
    (styleRows ?? []).map((r) => r.style).filter(Boolean)
  ).size;

  return (
    <main className="min-h-screen bg-cracked-cream">
      {/* ── Header ── */}
      <div className="px-4 pt-12 pb-4">
        <p className="font-[family-name:var(--font-bebas-neue)] text-cracked-orange text-sm tracking-widest">
          WHAT&apos;S CRACKING NEAR YOU
        </p>
        <h1 className="font-[family-name:var(--font-bebas-neue)] text-5xl text-cracked-dark leading-tight mt-1">
          CRACKED.
        </h1>
      </div>

      {/* ── Featured strip ── */}
      <section className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark">
            TOP OF THE COOLER
          </h2>
          <Link href="/shop" className="text-cracked-orange text-sm font-semibold font-[family-name:var(--font-dm-sans)]">
            See all →
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory">
          {(topRated ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="snap-start shrink-0 w-36 rounded-2xl bg-white border border-neutral-100 overflow-hidden"
            >
              <div className="w-full h-36 bg-neutral-50 flex items-center justify-center overflow-hidden">
                {p.thumbnail_url ? (
                  <Image
                    src={p.thumbnail_url}
                    alt={p.name}
                    width={120}
                    height={120}
                    className="object-contain p-2"
                  />
                ) : (
                  <span className="text-[10px] text-neutral-400 text-center px-2">{p.name}</span>
                )}
              </div>
              <div className="p-2.5">
                <p className="text-[10px] text-cracked-muted font-[family-name:var(--font-dm-sans)] truncate">{p.brand}</p>
                <p className="text-xs font-semibold text-cracked-dark line-clamp-2 leading-tight font-[family-name:var(--font-dm-sans)] mt-0.5">
                  {p.name}
                </p>
                <p className="text-cracked-orange font-[family-name:var(--font-jetbrains)] text-sm font-bold mt-1">
                  {formatPrice(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── New drops ── */}
      <section className="px-4 mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-[family-name:var(--font-bebas-neue)] text-2xl text-cracked-dark">
            NEW DROPS
          </h2>
          <span className="text-[10px] font-bold bg-cracked-lime text-cracked-dark px-2 py-0.5 rounded-full font-[family-name:var(--font-dm-sans)]">
            FRESH
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {(newDrops ?? []).slice(0, 6).map((p) => (
            <Link
              key={p.id}
              href={`/product/${p.id}`}
              className="rounded-2xl bg-white border border-neutral-100 overflow-hidden flex gap-3 p-3 items-center"
            >
              <div className="w-14 h-14 bg-neutral-50 rounded-xl flex items-center justify-center shrink-0">
                {p.thumbnail_url ? (
                  <Image src={p.thumbnail_url} alt={p.name} width={48} height={48} className="object-contain" />
                ) : (
                  <span className="text-[8px] text-neutral-400 text-center">{p.style}</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] text-cracked-muted truncate font-[family-name:var(--font-dm-sans)]">{p.brand}</p>
                <p className="text-xs font-semibold line-clamp-2 leading-tight font-[family-name:var(--font-dm-sans)]">{p.name}</p>
                <p className="text-cracked-orange text-xs font-bold font-[family-name:var(--font-jetbrains)] mt-0.5">
                  {formatPrice(p.price)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <div className="mx-4 mb-8 rounded-2xl bg-cracked-dark p-4 flex justify-around">
        {[
          { label: "Products", value: productCount ? `${productCount}` : "—" },
          { label: "Styles",   value: styleCount ? `${styleCount}` : "—" },
          { label: "Ontario",  value: "✓" },
        ].map(({ label, value }) => (
          <div key={label} className="text-center">
            <p className="font-[family-name:var(--font-bebas-neue)] text-3xl text-cracked-orange">{value}</p>
            <p className="text-[10px] text-white/50 font-[family-name:var(--font-dm-sans)] uppercase tracking-widest">{label}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
