// Server component — fetches reviews from Supabase

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUser } from "@/lib/auth";
import { RatingForm } from "./RatingForm";

type Review = {
  id:          number;
  rating:      number;
  body:        string | null;
  author_name: string;
  created_at:  string;
};

async function fetchReviews(productId: number): Promise<Review[]> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("review")
      .select("id, rating, body, author_name, created_at")
      .eq("product_id", productId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return [];
    return (data ?? []) as Review[];
  } catch {
    return [];
  }
}

function Stars({ value, large }: { value: number; large?: boolean }) {
  return (
    <span className={`${large ? "text-2xl" : "text-sm"} tracking-tight`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(value) ? "text-vermilion" : "text-ink/15"}>
          ★
        </span>
      ))}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? "s" : ""} ago`;
  const yrs = Math.floor(days / 365);
  return `${yrs} year${yrs > 1 ? "s" : ""} ago`;
}

export async function CommunityRatings({ productId }: { productId: number }) {
  const [reviews, user] = await Promise.all([fetchReviews(productId), getUser()]);
  const total   = reviews.length;
  const avg     = total > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / total
    : 0;
  const dist    = [5, 4, 3, 2, 1].map((n) => {
    const count = reviews.filter((r) => r.rating === n).length;
    const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
    return { star: n, count, pct };
  });

  return (
    <div className="space-y-10">
      {/* ── Section header ── */}
      <div>
        <p className="font-mono text-[9px] uppercase tracking-widest text-vermilion mb-3">
          Crowdsourced Paraphernalia
        </p>
        <h2 className="font-display text-3xl md:text-4xl tracking-tight text-ink">
          Community Reviews
        </h2>
      </div>

      {/* ── Rating overview ── */}
      <div className="border border-ink/15 p-5 md:p-7">
        {total > 0 ? (
          <div className="flex gap-10 md:gap-16">
            {/* Big number */}
            <div className="shrink-0 text-center">
              <div className="font-display-roman text-7xl leading-none text-ink">
                {Math.round(avg)}
              </div>
              <Stars value={avg} large />
              <p className="font-mono text-[9px] uppercase tracking-widest text-ink/40 mt-2">
                {total.toLocaleString()} rating{total !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 flex flex-col justify-center gap-3">
              {dist.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-ink/50 w-3 text-right">{star}</span>
                  <span className="text-vermilion text-sm">★</span>
                  <div className="flex-1 h-1.5 bg-ink/8">
                    <div
                      className="h-full bg-vermilion transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="font-mono text-[9px] text-ink/40 w-16 text-right shrink-0">
                    {count} ({pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="font-display-roman text-3xl text-ink/25 mb-2">No reviews yet.</p>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ink/25">
              Be the first to crack this one open.
            </p>
          </div>
        )}
      </div>

      {/* ── Rating Form ── */}
      <RatingForm productId={productId} isLoggedIn={!!user} />

      {/* ── Rating Feed ── */}
      {reviews.length > 0 && (
        <div>
          <h3 className="font-display text-xl text-ink mb-6">
            Rating Feed ({total})
          </h3>
          <div className="space-y-0 divide-y divide-ink/8">
            {reviews.map((r) => (
              <div key={r.id} className="py-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  {/* Left: avatar + meta */}
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-ink text-cream flex items-center justify-center font-mono text-[12px] uppercase shrink-0">
                      {r.author_name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold text-ink">
                        {r.author_name}
                      </p>
                      <p className="font-mono text-[9px] uppercase tracking-widest text-ink/35 mt-0.5">
                        {timeAgo(r.created_at)}
                      </p>
                    </div>
                  </div>
                  {/* Right: star badge */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 border border-vermilion/30 bg-vermilion/5 shrink-0">
                    <span className="text-vermilion text-xs">★</span>
                    <span className="font-mono text-[10px] text-vermilion font-medium">
                      {r.rating}
                    </span>
                  </div>
                </div>

                {/* Review body */}
                {r.body && (
                  <p className="font-sans text-sm text-ink/75 leading-relaxed ml-[52px] mb-3">
                    &ldquo;{r.body}&rdquo;
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 ml-[52px]">
                  <span className="font-mono text-[8px] uppercase tracking-widest text-ink/30 border border-ink/10 px-2 py-1">
                    Verified Ontario Review
                  </span>
                  <button className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-ink/35 hover:text-ink transition-colors">
                    <span>👍</span>
                    <span>Helpful</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
