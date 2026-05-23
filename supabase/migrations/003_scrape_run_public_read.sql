-- ============================================================
--  CRACKED — Allow public read of scrape_run for UI freshness
--  Migration: 003_scrape_run_public_read
-- ============================================================

-- Drop the existing deny-all policy
drop policy if exists "no public scrape_run access" on scrape_run;

-- Allow public to read scrape_run (observability is a feature, not a secret)
create policy "public read scrape_run"
  on scrape_run for select using (true);
