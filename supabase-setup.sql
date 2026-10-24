-- =========================================================
-- PROJECT SARAE — run this once in Supabase → SQL Editor → New query → Run
-- BEFORE RUNNING: replace anya.sarae@yahoo.com below if your admin login
-- will use a different email. Only this email can use the admin dashboard.
-- Safe to run again later; it won't delete your data.
-- =========================================================

create extension if not exists pgcrypto;

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

-- ---------- Stripe payment links (hidden — only admin can read them directly) ----------
create table if not exists public.payment_links (
  key         text primary key,   -- starterMonthly, businessYearly, addonStore, ...
  url         text check (url is null or url like 'https://%'),
  updated_at  timestamptz not null default now()
);
alter table public.payment_links enable row level security;
drop policy if exists "admin manages payment links" on public.payment_links;
create policy "admin manages payment links" on public.payment_links
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Private checkout invites (you create one after each Zoom call) ----------
create table if not exists public.checkout_invites (
  id                uuid primary key default gen_random_uuid(),
  code              text unique not null check (char_length(code) between 8 and 40),
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null default now() + interval '14 days',
  client_name       text not null check (char_length(client_name) between 1 and 100),
  client_email      text check (char_length(client_email) <= 200),
  business          text check (char_length(business) <= 120),
  recommended_plan  text check (recommended_plan in ('starter','business','pro')),
  call_date         date,
  signed_name       text,
  signed_at         timestamptz,
  chosen_plan       text,
  chosen_period     text,
  chosen_addons     text[],
  contract_version  text
);
alter table public.checkout_invites enable row level security;
drop policy if exists "admin manages invites" on public.checkout_invites;
create policy "admin manages invites" on public.checkout_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Helper: payment links a signed client is allowed to see
create or replace function public._invite_links(inv public.checkout_invites)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'plan_url', (select url from payment_links
                 where key = inv.chosen_plan || case when inv.chosen_period = 'yearly' then 'Yearly' else 'Monthly' end),
    'addons', coalesce((select json_agg(json_build_object('key', key, 'url', url))
                        from payment_links
                        where key = any(coalesce(inv.chosen_addons, '{}'))), '[]'::json)
  )
$$;
revoke all on function public._invite_links(public.checkout_invites) from public, anon, authenticated;

-- Client opens checkout.html?code=...  → returns their invite (or null if invalid/expired)
create or replace function public.get_invite(p_code text)
returns json language plpgsql stable security definer set search_path = public as $$
declare inv checkout_invites;
begin
  select * into inv from checkout_invites where code = p_code and expires_at > now();
  if not found then return null; end if;
  return json_build_object(
    'client_name', inv.client_name,
    'business', inv.business,
    'recommended_plan', inv.recommended_plan,
    'signed', inv.signed_at is not null,
    'signed_name', inv.signed_name,
    'chosen_plan', inv.chosen_plan,
    'chosen_period', inv.chosen_period,
    'chosen_addons', inv.chosen_addons,
    'links', case when inv.signed_at is not null then _invite_links(inv) else null end
  );
end $$;

-- Client signs the agreement → records signature and returns their payment links
create or replace function public.sign_and_get_links(
  p_code text, p_name text, p_plan text, p_period text, p_addons text[] default '{}')
returns json language plpgsql security definer set search_path = public as $$
declare inv checkout_invites;
begin
  if p_plan not in ('starter','business','pro') then raise exception 'invalid plan'; end if;
  if p_period not in ('monthly','yearly') then raise exception 'invalid period'; end if;
  if char_length(coalesce(trim(p_name), '')) < 2 or char_length(p_name) > 100 then raise exception 'invalid name'; end if;
  if exists (select 1 from unnest(coalesce(p_addons, '{}')) a where a not in ('addonAccounts','addonStore','addonGoogle','addonReminders','addonFollowups','addonWinback','addonTexts','addonSocial','addonReports')) then
    raise exception 'invalid add-on';
  end if;
  update checkout_invites
     set signed_name = trim(p_name), signed_at = now(), chosen_plan = p_plan,
         chosen_period = p_period, chosen_addons = coalesce(p_addons, '{}'), contract_version = '2026-10'
   where code = p_code and expires_at > now() and signed_at is null
   returning * into inv;
  if not found then
    -- already signed: keep the original signature, just return their links again
    select * into inv from checkout_invites where code = p_code and expires_at > now() and signed_at is not null;
    if not found then return null; end if;
  end if;
  return _invite_links(inv);
end $$;

grant execute on function public.get_invite(text) to anon, authenticated;
grant execute on function public.sign_and_get_links(text, text, text, text, text[]) to anon, authenticated;

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
