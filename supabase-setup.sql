-- =========================================================
-- PROJECT SARAE — run this once in Supabase → SQL Editor → New query → Run
-- BEFORE RUNNING: replace anya.sarae@yahoo.com below if your admin login
-- will use a different email. Only this email can see the admin dashboard.
-- =========================================================

-- Who counts as admin
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'email', '') = 'anya.sarae@yahoo.com'
$$;

-- ---------- Analytics (page views + button clicks) ----------
create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  event       text not null default 'view' check (char_length(event) <= 40),
  label       text check (char_length(label) <= 80),
  path        text check (char_length(path) <= 200),
  referrer    text check (char_length(referrer) <= 300),
  device      text check (device in ('mobile','tablet','desktop')),
  session_id  text check (char_length(session_id) <= 40)
);
alter table public.page_views enable row level security;
drop policy if exists "visitors log views" on public.page_views;
create policy "visitors log views" on public.page_views
  for insert to anon, authenticated with check (true);
drop policy if exists "admin reads views" on public.page_views;
create policy "admin reads views" on public.page_views
  for select to authenticated using (public.is_admin());
drop policy if exists "admin deletes views" on public.page_views;
create policy "admin deletes views" on public.page_views
  for delete to authenticated using (public.is_admin());

-- ---------- Reviews (new reviews stay hidden until you approve them) ----------
create table if not exists public.reviews (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 80),
  business    text check (char_length(business) <= 100),
  rating      int  not null check (rating between 1 and 5),
  body        text not null check (char_length(body) between 1 and 1000),
  approved    boolean not null default false
);
alter table public.reviews enable row level security;
drop policy if exists "anyone submits a review" on public.reviews;
create policy "anyone submits a review" on public.reviews
  for insert to anon, authenticated with check (approved = false);
drop policy if exists "public sees approved reviews" on public.reviews;
create policy "public sees approved reviews" on public.reviews
  for select to anon, authenticated using (approved = true or public.is_admin());
drop policy if exists "admin updates reviews" on public.reviews;
create policy "admin updates reviews" on public.reviews
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin deletes reviews" on public.reviews;
create policy "admin deletes reviews" on public.reviews
  for delete to authenticated using (public.is_admin());

-- ---------- Site settings (your photo, About text, portfolio images) ----------
create table if not exists public.site_settings (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "public reads settings" on public.site_settings;
create policy "public reads settings" on public.site_settings
  for select to anon, authenticated using (true);
drop policy if exists "admin writes settings" on public.site_settings;
create policy "admin writes settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Photo storage ----------
insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do nothing;

drop policy if exists "admin uploads images" on storage.objects;
create policy "admin uploads images" on storage.objects
  for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admin updates images" on storage.objects;
create policy "admin updates images" on storage.objects
  for update to authenticated using (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admin deletes images" on storage.objects;
create policy "admin deletes images" on storage.objects
  for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());
