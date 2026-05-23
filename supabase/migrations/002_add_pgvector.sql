-- ============================================================
--  CRACKED — ML Layer Setup (Phase 4)
--  Migration: 002_add_pgvector
-- ============================================================

-- Enable pgvector
create extension if not exists vector;

-- Add embedding column to product table
-- Using 384 dimensions for all-MiniLM-L6-v2 which is common and lightweight for this use case
alter table product 
add column if not exists embedding vector(384);

-- Create a function to find similar products based on cosine distance
create or replace function match_products(
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  exclude_product_id bigint default null
)
returns table (
  id bigint,
  name text,
  brand_name text,
  normalized_category normalized_category,
  abv numeric(4,2),
  price_cents integer,
  image_url text,
  similarity float
)
language sql stable
as $$
  select
    p.id,
    p.name,
    b.name as brand_name,
    p.normalized_category,
    p.abv,
    p.price_cents,
    p.image_url,
    1 - (p.embedding <=> query_embedding) as similarity
  from product p
  join brand b on b.id = p.brand_id
  where p.embedding is not null
    and (exclude_product_id is null or p.id != exclude_product_id)
    and 1 - (p.embedding <=> query_embedding) > match_threshold
  order by p.embedding <=> query_embedding
  limit match_count;
$$;
