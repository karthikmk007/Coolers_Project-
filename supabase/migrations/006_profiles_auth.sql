-- ============================================================
--  CRACKED — Profiles table, RLS, and auto-provision trigger
--  Migration: 006_profiles_auth
--  Apply in: Supabase Dashboard → SQL Editor (idempotent, safe to re-run)
--
--  NOTE: The signup server action already creates a profile via the
--  service-role client, so login works without this migration. This adds
--  the canonical trigger so users created via the Supabase dashboard / admin
--  API also get a profile, plus explicit RLS policies. Recommended for prod.
-- ============================================================

-- 1. Table (no-op if it already exists in your project)
create table if not exists public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  username         text unique,
  display_name     text,
  avatar_url       text,
  is_pro           boolean not null default false,
  taste_sweet_pref numeric not null default 50,
  taste_bold_pref  numeric not null default 50,
  taste_carb_pref  numeric not null default 50,
  favorite_styles  text[]  not null default '{}',
  followers_count  int     not null default 0,
  following_count  int     not null default 0,
  ratings_count    int     not null default 0,
  created_at       timestamptz not null default now()
);

-- 2. Row Level Security
alter table public.profiles enable row level security;

drop policy if exists "profiles public read" on public.profiles;
create policy "profiles public read"
  on public.profiles for select using (true);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
  on public.profiles for update using (auth.uid() = id);

-- 3. Auto-provision a profile whenever a new auth user is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 4. Backfill profiles for any pre-existing users
insert into public.profiles (id, username, display_name)
select u.id,
       coalesce(u.raw_user_meta_data->>'handle', split_part(u.email, '@', 1)),
       coalesce(u.raw_user_meta_data->>'handle', split_part(u.email, '@', 1))
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
