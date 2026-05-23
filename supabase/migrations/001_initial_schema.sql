-- ============================================================
--  CRACKED — Initial Schema
--  Migration: 001_initial_schema
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
-- pgvector is enabled separately when the ML layer is wired up:
-- create extension if not exists "vector";

-- ── Enums ───────────────────────────────────────────────────
create type normalized_category as enum (
  'hard_seltzer',
  'cooler',
  'cider',
  'radler',
  'other'
);

create type scrape_status as enum (
  'running',
  'success',
  'failed'
);

-- ── brand ───────────────────────────────────────────────────
create table brand (
  id         bigint generated always as identity primary key,
  name       text    not null unique,
  created_at timestamptz not null default now()
);

comment on table brand is
  'Canonical brand list built from LCBO product names. One row per distinct brand.';

-- ── product ─────────────────────────────────────────────────
create table product (
  id                  bigint generated always as identity primary key,
  name                text              not null,
  brand_id            bigint            not null references brand (id) on delete cascade,
  normalized_category normalized_category not null,
  abv                 numeric(4, 2),          -- e.g. 5.00 (%)
  price_cents         integer,                -- e.g. 349 = $3.49
  image_url           text,                   -- Supabase Storage URL or null
  lcbo_id             text unique,            -- LCBO product identifier (idempotency key for scraper)
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

comment on table product is
  'One row per RTD SKU. lcbo_id is used as the idempotency key during scrape upserts.';

comment on column product.price_cents is
  'Stored as integer cents to avoid floating-point currency errors.';

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger product_updated_at
  before update on product
  for each row execute procedure set_updated_at();

-- Indexes
create index product_brand_id_idx      on product (brand_id);
create index product_category_idx      on product (normalized_category);
create index product_price_cents_idx   on product (price_cents);
create index product_abv_idx           on product (abv);

-- ── scrape_run ──────────────────────────────────────────────
create table scrape_run (
  id                 bigint generated always as identity primary key,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  status             scrape_status not null default 'running',
  products_upserted  integer not null default 0,
  products_skipped   integer not null default 0,
  error_message      text
);

comment on table scrape_run is
  'Observability log for every LCBO scrape job. One row per run.';

-- ── Row-Level Security ───────────────────────────────────────
-- Public reads, no public writes. Writes go through service role key.

alter table brand      enable row level security;
alter table product    enable row level security;
alter table scrape_run enable row level security;

-- Anyone can read products and brands
create policy "public read brands"
  on brand for select using (true);

create policy "public read products"
  on product for select using (true);

-- scrape_run is internal — no public read
create policy "no public scrape_run access"
  on scrape_run for select using (false);
