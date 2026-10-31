-- =========================================================
-- PROJECT SARAE — ADMIN TOOLS (Sales, Outreach, Content Studio)
-- Run once in Supabase → SQL Editor → New query → Run.
-- Run supabase-setup.sql first (this uses its is_admin() check).
-- Safe to run again; it won't delete your data.
-- =========================================================

-- ---------- Outreach pipeline (businesses you contact) ----------
create table if not exists public.outreach_leads (
  id              bigint generated always as identity primary key,
  created_at      timestamptz not null default now(),
  business        text not null check (char_length(business) between 1 and 120),
  contact_name    text check (char_length(contact_name) <= 100),
  email           text check (char_length(email) <= 200),
  phone           text check (char_length(phone) <= 40),
  instagram       text check (char_length(instagram) <= 80),
  niche           text check (char_length(niche) <= 60),
  city            text check (char_length(city) <= 80),
  status          text not null default 'new'
                  check (status in ('new','contacted','replied','call_booked','won','lost')),
  value           numeric(10,2) check (value >= 0),
  last_contact    date,
  next_follow_up  date,
  notes           text check (char_length(notes) <= 2000)
);
alter table public.outreach_leads enable row level security;
drop policy if exists "admin manages leads" on public.outreach_leads;
create policy "admin manages leads" on public.outreach_leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Content Studio: saved scripts + posting log ----------
create table if not exists public.content_posts (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  topic         text check (char_length(topic) <= 400),
  script        jsonb,
  caption       text check (char_length(caption) <= 2200),
  status        text not null default 'draft' check (status in ('draft','posted','failed')),
  ig_media_id   text check (char_length(ig_media_id) <= 60),
  permalink     text check (char_length(permalink) <= 300)
);
alter table public.content_posts enable row level security;
drop policy if exists "admin manages posts" on public.content_posts;
create policy "admin manages posts" on public.content_posts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- Video/image uploads for Instagram (public so Instagram can fetch them) ----------
-- 50 MB per file (the Supabase free-plan limit). Files are deleted after posting.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-media', 'content-media', true, 52428800,
        array['video/mp4','video/quicktime','image/jpeg'])
on conflict (id) do update set public = true, file_size_limit = 52428800,
        allowed_mime_types = array['video/mp4','video/quicktime','image/jpeg'];

drop policy if exists "admin uploads media" on storage.objects;
create policy "admin uploads media" on storage.objects
  for insert to authenticated with check (bucket_id = 'content-media' and public.is_admin());
drop policy if exists "admin deletes media" on storage.objects;
create policy "admin deletes media" on storage.objects
  for delete to authenticated using (bucket_id = 'content-media' and public.is_admin());
drop policy if exists "admin lists media" on storage.objects;
create policy "admin lists media" on storage.objects
  for select to authenticated using (bucket_id = 'content-media' and public.is_admin());

-- ---------- Private admin settings (cold email template, etc.) — never public ----------
create table if not exists public.admin_settings (
  key         text primary key check (char_length(key) <= 60),
  value       text check (char_length(value) <= 5000),
  updated_at  timestamptz not null default now()
);
alter table public.admin_settings enable row level security;
drop policy if exists "admin only settings" on public.admin_settings;
create policy "admin only settings" on public.admin_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
