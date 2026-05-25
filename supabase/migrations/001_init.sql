-- Migration: 001_init
-- Creates brand, product, and scrape_run tables according to constraints

create table brand (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

create table product (
  id uuid primary key default gen_random_uuid(),
  lcbo_sku text not null unique,
  name text not null,
  brand_id uuid references brand(id),
  raw_category text,              -- whatever LCBO calls it
  normalized_category text,       -- our enum, filled in Module 2
  abv numeric(4,2),
  volume_ml integer,
  package_format text,            -- "4x355mL", "tallboy", "473mL single"
  price_cents integer,
  product_url text not null,
  image_url text,
  description_raw text,
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  is_active boolean default true
);

create table scrape_run (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  finished_at timestamptz,
  products_discovered integer default 0,
  products_updated integer default 0,
  parse_errors integer default 0,
  http_requests integer default 0,
  status text,                    -- 'success' | 'partial' | 'failed'
  error_message text
);

create index idx_product_active on product(is_active);
create index idx_product_last_seen on product(last_seen_at);
