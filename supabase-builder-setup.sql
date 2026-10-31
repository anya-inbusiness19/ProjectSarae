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
