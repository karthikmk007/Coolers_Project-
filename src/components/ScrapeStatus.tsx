import { supabase } from "@/lib/supabase";

/**
 * Server Component — queries for catalog freshness.
 * Primary: scrape_run table (may be RLS-blocked for anon).
 * Fallback: latest product.updated_at timestamp.
 */
export async function ScrapeStatus() {
  const [scrapeRes, countRes, latestProductRes] = await Promise.all([
    supabase
      .from("scrape_run")
      .select("finished_at, products_upserted")
      .eq("status", "success")
      .order("finished_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("product").select("id", { count: "exact", head: true }),
    supabase
      .from("product")
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const lastScrape = scrapeRes.data;
  const totalProducts = countRes.count ?? 0;

  // Use scrape_run timestamp if available, else fall back to latest product update
  const lastTimestamp =
    lastScrape?.finished_at || latestProductRes.data?.updated_at;

  let freshness = "Never synchronized";
  if (lastTimestamp) {
    const d = new Date(lastTimestamp);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHrs / 24);

    if (diffHrs < 1) freshness = "Just now";
    else if (diffHrs < 24) freshness = `${diffHrs}h ago`;
    else if (diffDays < 7) freshness = `${diffDays}d ago`;
    else freshness = d.toLocaleDateString("en-CA");
  }

  const isActive = totalProducts > 0;
  const dotColor = isActive ? "bg-lime" : "bg-vermilion";

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] tracking-widest uppercase text-ink/40 border-b border-ink/10 pb-6 mb-8">
      <div className="flex items-center gap-2">
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${dotColor}`} />
        <span>Catalog {isActive ? "Active" : "Offline"}</span>
      </div>
      <span className="text-ink/20">·</span>
      <span>{totalProducts} SKUs indexed</span>
      <span className="text-ink/20">·</span>
      <span>Last sync: {freshness}</span>
      {lastScrape?.products_upserted !== undefined &&
        lastScrape.products_upserted > 0 && (
          <>
            <span className="text-ink/20">·</span>
            <span>{lastScrape.products_upserted} updated</span>
          </>
        )}
    </div>
  );
}
