# CRACKED — Deployment Guide ($0 budget)

A budget-friendly production setup for the CRACKED web app.

## Architecture (important)

**Supabase does not host the Next.js app.** It hosts your data and auth. The
Next.js app runs on a separate web host. The free stack:

```
┌─────────────────────────┐         ┌──────────────────────────────┐
│  Vercel (free "Hobby")  │  HTTPS  │  Supabase (free tier)         │
│  • Next.js 16 app (SSR) │ ──────▶ │  • Postgres (products, etc.)  │
│  • Server actions / API │         │  • Auth (email + password)    │
│  • Middleware            │        │  • Storage (optional images)  │
└─────────────────────────┘         └──────────────────────────────┘
```

Total cost: **$0/month**. The optional Python ML API (`nixpacks.toml` /
`railway.toml`) is **separate and not required** — recommendations degrade
gracefully when `NEXT_PUBLIC_ML_API_URL` is unset.

---

## Step 1 — Supabase one-time setup

In the [Supabase dashboard](https://supabase.com/dashboard) for your project
(`oovvyzxjchoxqyuqncjo`):

1. **Disable email confirmation** (enables instant signup → login):
   `Authentication → Providers → Email` → uncheck **"Confirm email"** → Save.
2. **Set auth URLs** (do this *after* you have your Vercel URL from Step 2):
   `Authentication → URL Configuration`
   - **Site URL**: `https://<your-app>.vercel.app`
   - **Redirect URLs**: add `https://<your-app>.vercel.app/auth/callback`
3. **(Recommended) Run the profiles migration**: `SQL Editor` → paste the
   contents of `supabase/migrations/006_profiles_auth.sql` → Run. This adds the
   profile auto-provision trigger + RLS. *(Login already works without it — the
   signup action creates profiles — but this is the canonical setup.)*
4. **Data is already seeded** (482 products). To re-seed later:
   `npx tsx scripts/seed-products.ts` (needs `SUPABASE_SERVICE_ROLE_KEY`).

---

## Step 2 — Deploy to Vercel

1. Push the repo to GitHub (already done).
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the
   `Coolers_Project-` repo. Vercel auto-detects Next.js 16 — no config needed.
3. Before the first deploy, add **Environment Variables** (apply to
   *Production*, *Preview*, and *Development*):

   | Variable | Value | Exposure |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://oovvyzxjchoxqyuqncjo.supabase.co` | Public |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key | Public |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service-role key | **Secret — never `NEXT_PUBLIC_`** |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-app>.vercel.app` | Public |

   Optional: `NEXT_PUBLIC_ML_API_URL` (only if the FastAPI recommender is live).

4. Click **Deploy**. Every push to `main` now auto-deploys; PRs get preview URLs.
5. Go back and complete **Step 1.2** with your real Vercel URL.

---

## Step 3 — Post-deploy checklist

- [ ] Visit the site → `/` redirects to `/home`, products + images load.
- [ ] `/signup` → create an account → lands logged-in on `/home`.
- [ ] `/more` shows your handle (not "Guest") and **Sign Out** works.
- [ ] `/login` works after signing out.
- [ ] A `/product/[id]` page shows the taste profile + estimated nutrition.

---

## Free-tier caveats (know these)

- **Supabase free** pauses the project after **~7 days of inactivity** — the
  first request after that is slow while it wakes. Limits: 500 MB DB, 50k
  monthly active users, ~3–4 confirmation emails/hour (irrelevant once email
  confirmation is off). To keep it warm, add a cron that pings the app
  (e.g. a free [cron-job.org](https://cron-job.org) hitting `/home` daily).
- **Vercel Hobby** is for **non-commercial** use; 100 GB bandwidth/month. Fine
  for a portfolio. Upgrade to Pro only if you commercialize.
- **Secrets**: never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser (no
  `NEXT_PUBLIC_` prefix). It's used only in server actions / scripts.

---

## Custom domain (optional, ~$10/yr)

Vercel → Project → `Settings → Domains` → add your domain and follow the DNS
steps. Then update Supabase **Site URL** + **Redirect URLs** to match.
