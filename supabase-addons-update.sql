-- Run this ONCE in Supabase → SQL Editor → New query → Run.
-- It lets clients pick the new add-ons at checkout. Nothing else changes.

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

grant execute on function public.sign_and_get_links(text, text, text, text, text[]) to anon, authenticated;
