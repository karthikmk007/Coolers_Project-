-- ============================================================
--  CRACKED — Community Reviews
--  Migration: 004_add_reviews
--  Apply in: Supabase Dashboard → SQL Editor
-- ============================================================

create table if not exists review (
  id           bigserial primary key,
  product_id   bigint not null references product(id) on delete cascade,
  rating       smallint not null check (rating between 1 and 5),
  body         text,
  author_name  text not null default 'Anonymous',
  created_at   timestamptz not null default now()
);

-- Index for fast per-product lookup
create index if not exists review_product_id_idx on review(product_id);

-- Row Level Security
alter table review enable row level security;

create policy "public read reviews"
  on review for select using (true);

create policy "public insert reviews"
  on review for insert with check (true);
