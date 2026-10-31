-- =========================================================
-- PROJECT SARAE — SITE BUILDER
-- Run once in Supabase → SQL Editor → New query → Run.
-- Run supabase-setup.sql first (this uses its is_admin() check).
-- Safe to run again; it won't delete your data.
-- =========================================================

-- ---------- Client websites you build ----------
create table if not exists public.client_sites (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  slug            text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,99}$'),
  business        text not null check (char_length(business) between 1 and 120),
  plan            text check (char_length(plan) <= 40),
  data            jsonb not null default '{}'::jsonb,   -- everything you typed in the builder
  pages           jsonb not null default '{}'::jsonb,   -- the AI-written page content
  repo_url        text check (char_length(repo_url) <= 300),
  live_url        text check (char_length(live_url) <= 300),
  published_at    timestamptz,
  assistant_on    boolean not null default false,
  assistant_name  text check (char_length(assistant_name) <= 40),
  assistant_info  text check (char_length(assistant_info) <= 8000)
);
alter table public.client_sites enable row level security;
drop policy if exists "admin manages client sites" on public.client_sites;
create policy "admin manages client sites" on public.client_sites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- AI assistant daily message counts (only the site-assistant function uses this) ----------
create table if not exists public.assistant_usage (
  slug   text not null,
  day    date not null,
  count  int  not null default 0,
  primary key (slug, day)
);
alter table public.assistant_usage enable row level security;
drop policy if exists "admin reads assistant usage" on public.assistant_usage;
create policy "admin reads assistant usage" on public.assistant_usage
  for select to authenticated using (public.is_admin());

-- =========================================================
-- CLIENT LOGINS: which client email can manage which site
-- =========================================================
create table if not exists public.site_members (
  site_slug   text not null references public.client_sites(slug) on update cascade on delete cascade,
  email       text not null check (email = lower(email) and char_length(email) <= 200),
  created_at  timestamptz not null default now(),
  primary key (site_slug, email)
);
alter table public.site_members enable row level security;

create or replace function public.is_site_member(p_slug text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.site_members m
                 where m.site_slug = p_slug and m.email = lower(coalesce(auth.jwt() ->> 'email', '')))
$$;
grant execute on function public.is_site_member(text) to anon, authenticated;

drop policy if exists "admin manages members" on public.site_members;
create policy "admin manages members" on public.site_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "members see their own rows" on public.site_members;
create policy "members see their own rows" on public.site_members
  for select to authenticated using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Clients can READ their own site; their edits are saved through the client-api function.
drop policy if exists "members read their site" on public.client_sites;
create policy "members read their site" on public.client_sites
  for select to authenticated using (public.is_site_member(slug));

-- =========================================================
-- STORE: products, orders, Stripe keys
-- =========================================================
create table if not exists public.client_products (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  site_slug    text not null references public.client_sites(slug) on update cascade on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  description  text check (char_length(description) <= 600),
  price_cents  int  not null check (price_cents between 50 and 10000000),
  image_url    text check (char_length(image_url) <= 600),
  inventory    int  check (inventory is null or inventory >= 0),   -- empty = unlimited
  active       boolean not null default true,
  sort         int not null default 0
);
create index if not exists client_products_site on public.client_products (site_slug, sort);
alter table public.client_products enable row level security;
drop policy if exists "anyone sees active products" on public.client_products;
create policy "anyone sees active products" on public.client_products
  for select to anon, authenticated using (active or public.is_admin() or public.is_site_member(site_slug));
drop policy if exists "owner manages products" on public.client_products;
create policy "owner manages products" on public.client_products
  for all to authenticated using (public.is_admin() or public.is_site_member(site_slug))
  with check (public.is_admin() or public.is_site_member(site_slug));

create table if not exists public.client_orders (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  site_slug       text not null references public.client_sites(slug) on update cascade on delete cascade,
  stripe_session  text not null unique,
  email           text,
  name            text,
  phone           text,
  total_cents     int not null default 0,
  currency        text not null default 'usd',
  items           jsonb not null default '[]'::jsonb,
  shipping        jsonb,
  status          text not null default 'paid' check (status in ('paid','fulfilled','refunded','canceled')),
  note            text check (char_length(note) <= 1000)
);
create index if not exists client_orders_site on public.client_orders (site_slug, created_at desc);
alter table public.client_orders enable row level security;
drop policy if exists "owner reads orders" on public.client_orders;
create policy "owner reads orders" on public.client_orders
  for select to authenticated using (public.is_admin() or public.is_site_member(site_slug));
drop policy if exists "owner updates orders" on public.client_orders;
create policy "owner updates orders" on public.client_orders
  for update to authenticated using (public.is_admin() or public.is_site_member(site_slug))
  with check (public.is_admin() or public.is_site_member(site_slug));

-- Stripe secret keys: NO policies on purpose, so nobody can read them from the browser.
-- Only the "store" function (service role) uses this table.
create table if not exists public.client_store_keys (
  site_slug      text primary key references public.client_sites(slug) on update cascade on delete cascade,
  stripe_secret  text not null,
  updated_at     timestamptz not null default now()
);
alter table public.client_store_keys enable row level security;

-- Clients can upload photos for their own site only (into site-images/builder/<their-site>/...).
drop policy if exists "members upload site photos" on storage.objects;
create policy "members upload site photos" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-images' and (storage.foldername(name))[1] = 'builder'
    and public.is_site_member((storage.foldername(name))[2]));
