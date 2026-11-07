-- =========================================================
-- PROJECT SARAE — WEBSITE ORDERS (the "choose a plan → questions → checkout" flow)
-- Run supabase-setup.sql first (this uses its is_admin() check and payment_links table).
-- Then run this whole file once in Supabase → SQL Editor → New query → Run.
-- Safe to run again; it won't delete data.
-- =========================================================

create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users on delete cascade,
  created_at      timestamptz not null default now(),
  plan            text not null check (plan in ('starter','business','pro')),
  billing         text not null default 'monthly' check (billing in ('monthly','yearly')),
  contact_name    text not null check (char_length(contact_name) between 1 and 100),
  business_name   text not null check (char_length(business_name) between 1 and 150),
  business_type   text check (char_length(business_type) <= 200),
  vibe            text check (char_length(vibe) <= 60),
  colors          text[] default '{}',
  logo_choice     text check (char_length(logo_choice) <= 60),
  logo_path       text,
  font            text check (char_length(font) <= 40),
  features        text[] default '{}',
  inspiration     text check (char_length(inspiration) <= 500),
  notes           text check (char_length(notes) <= 3000),
  email           text not null check (char_length(email) <= 200),
  phone           text check (char_length(phone) <= 40),
  contact_method  text check (char_length(contact_method) <= 20),
  best_time       text check (char_length(best_time) <= 20),
  paid            boolean not null default false,
  paid_at         timestamptz,
  stripe_customer text,
  status          text not null default 'received' check (status in ('received','designing','review','live','cancelled')),
  site_url        text check (site_url is null or site_url like 'https://%')
);
alter table public.orders enable row level security;

drop policy if exists "customers create own order" on public.orders;
create policy "customers create own order" on public.orders for insert to authenticated
  with check (user_id = auth.uid() and paid = false and status = 'received' and site_url is null);

drop policy if exists "see own orders, admin sees all" on public.orders;
create policy "see own orders, admin sees all" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "only admin updates orders" on public.orders;
create policy "only admin updates orders" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "only admin deletes orders" on public.orders;
create policy "only admin deletes orders" on public.orders for delete to authenticated
  using (public.is_admin());

-- Checkout links for one order (only its owner or you can get them).
-- Uses the Stripe links you already saved in admin (starterMonthly, businessYearly, setupFee...).
create or replace function public.order_checkout_links(p_order uuid)
returns json language plpgsql stable security definer set search_path = public as $$
declare o orders; fee numeric;
begin
  select * into o from orders where id = p_order and (user_id = auth.uid() or is_admin());
  if not found then return null; end if;
  select case when value ~ '^\s*[0-9]+(\.[0-9]+)?\s*$' then value::numeric else 0 end
    into fee from site_settings where key = 'setup_fee';
  return json_build_object(
    'plan_url',  (select url from payment_links
                  where key = o.plan || case when o.billing = 'yearly' then 'Yearly' else 'Monthly' end),
    'setup_url', case when coalesce(fee, 0) > 0 then (select url from payment_links where key = 'setupFee') end
  );
end $$;
revoke all on function public.order_checkout_links(uuid) from public, anon;
grant execute on function public.order_checkout_links(uuid) to authenticated;

-- Private storage for logos customers upload
insert into storage.buckets (id, name, public) values ('logos', 'logos', false) on conflict (id) do nothing;

drop policy if exists "upload own logo" on storage.objects;
create policy "upload own logo" on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "read own logo or admin" on storage.objects;
create policy "read own logo or admin" on storage.objects for select to authenticated
  using (bucket_id = 'logos' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
