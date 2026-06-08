-- ============================================================
--  CRACKED Phase 1 — Discovery Products
--  Migration: 005_discover_products
--  Apply in: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists products (
  id               uuid primary key default gen_random_uuid(),
  sku              text not null unique,
  name             text not null,
  producer         text,
  price_cents      int  not null,
  abv              numeric(5,2),
  volume_ml        int,
  image_url        text,

  -- LLM / rule-derived enrichment fields
  flavor_tags      text[]   not null default '{}',
  sweetness_tier   text     check (sweetness_tier in ('low', 'medium', 'high')),
  sugar_estimate_g numeric(6,1),
  kcal_estimate    int,

  -- IMPORTANT: all nutrition fields are estimates — never present as verified facts
  is_estimated     boolean not null default true,

  created_at       timestamptz not null default now()
);

-- Fast look-up by sweetness and flavor tags
create index if not exists products_sweetness_idx   on products (sweetness_tier);
create index if not exists products_flavor_tags_idx on products using gin (flavor_tags);
create index if not exists products_abv_idx         on products (abv);

-- Public read, no auth required for Phase 1
alter table products enable row level security;

create policy "public can read products"
  on products for select using (true);
