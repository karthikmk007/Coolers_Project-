import { supabase } from "@/lib/supabase";

/**
 * Server Component — shows the latest scrape_run entry.
 * Placed in the homepage hero sidebar so recruiters can see
 * the ingestion pipeline status at a glance.
 */
export async function ScrapeRunPanel() {
  const { data: run } = await supabase
    .from("scrape_run")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="border border-ink/15 p-6 font-mono text-sm min-w-[280px] max-w-xs">
      <div className="text-[10px] tracking-widest uppercase text-ink/40 mb-5">
        Latest Scrape_Run
      </div>

      {run ? (
        <div className="space-y-4">
          {/* Status indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full ${
                run.status === "success"
                  ? "bg-lime"
                  : run.status === "running"
                  ? "bg-amber"
                  : "bg-vermilion"
              }`}
            />
            <span className="text-[10px] tracking-widest uppercase text-ink/60">
              {run.status}
            </span>
          </div>

          {/* Timestamp */}
          {run.finished_at && (
            <div className="text-ink/40 text-xs">
              Finished{" "}
              {new Date(run.finished_at).toLocaleDateString("en-CA")}{" "}
              {new Date(run.finished_at).toLocaleTimeString("en-CA", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}

          {/* Counts */}
          <div className="text-ink text-sm leading-relaxed">
            {run.products_upserted} product
            {run.products_upserted !== 1 ? "s" : ""} upserted
            {run.products_skipped
              ? `, ${run.products_skipped} skipped`
              : ""}
          </div>

          {/* Error */}
          {run.error_message && (
            <div className="text-vermilion text-xs leading-relaxed border-l-2 border-vermilion/40 pl-3">
              {run.error_message}
            </div>
          )}

          <div className="text-ink/40 text-xs leading-relaxed pt-2 border-t border-ink/10">
            Every ingestion is logged for observability — failures, counts
            and timing visible in the dev console.
          </div>
        </div>
      ) : (
        <>
          <p className="text-ink leading-relaxed mb-5">
            No runs yet. Cron pipeline pending GitHub Actions wiring.
          </p>
          <p className="text-ink/50 text-xs leading-relaxed">
            Every ingestion is logged for observability — failures, counts
            and timing visible in the dev console.
          </p>
        </>
      )}
    </div>
  );
}
