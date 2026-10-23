-- Ilo: allow student sign-in from ANY Indian academic email (…@<college>.ac.in),
-- not only domains that were registered by hand.
-- Run this in the Supabase SQL Editor. It replaces functions in place, so the Auth Hook
-- ("Before User Created") that already points at hook_before_user_created keeps working.
--
-- How it behaves:
--   * A domain already in institution_domains still maps to its institution (exact match first).
--   * Any other  x.ac.in / students.x.ac.in  email is accepted. Sub-domains are folded into the
--     college domain (students.iiitn.ac.in -> iiitn.ac.in), and an institution named after that
--     domain is created automatically the first time someone signs in.
--   * Anything not ending in .ac.in and not already registered is still refused.

-- 1) Pure helpers --------------------------------------------------------------------------

-- Domain part of an email, lower-cased
create or replace function public.email_domain(p_email text) returns text
language sql immutable set search_path = '' as $$
  select lower(split_part(coalesce(p_email, ''), '@', 2))
$$;

-- True only for real academic domains: one or more valid labels followed by .ac.in
create or replace function public.is_ac_in_domain(p_domain text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(p_domain, '') ~ '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+ac\.in$'
$$;

-- students.iiitn.ac.in -> iiitn.ac.in  (the college's own domain)
create or replace function public.ac_in_college_domain(p_domain text) returns text
language sql immutable set search_path = '' as $$
  select regexp_replace(p_domain, '^.*\.([a-z0-9]([a-z0-9-]*[a-z0-9])?\.ac\.in)$', '\1')
$$;

-- 2) Sign-up gate (Auth Hook: "Before User Created") ----------------------------------------
create or replace function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_domain text := public.email_domain(event -> 'user' ->> 'email');
begin
  if public.institution_for_email(event -> 'user' ->> 'email') is null
     and not public.is_ac_in_domain(v_domain) then
    return jsonb_build_object('error', jsonb_build_object(
      'message', 'Sign-in is limited to college email IDs ending in .ac.in.',
      'http_code', 403));
  end if;
  return '{}'::jsonb;
end $$;
grant  execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- 3) Find the institution for an email, creating one for a new .ac.in college ----------------
-- Not stable (it may insert), so it is only used by the sign-up trigger below.
create or replace function public.resolve_institution_for_email(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_domain text := public.email_domain(p_email);
  v_college text;
  v_inst uuid;
  v_new uuid;
begin
  -- 1. exact, hand-registered domain
  v_inst := public.institution_for_email(p_email);
  if v_inst is not null then return v_inst; end if;

  if not public.is_ac_in_domain(v_domain) then return null; end if;

  -- 2. the college's own domain (sub-domain folded in)
  v_college := public.ac_in_college_domain(v_domain);
  select institution_id into v_inst from public.institution_domains where domain = v_college;
  if v_inst is not null then return v_inst; end if;

  -- 3. first student from this college: create it (safe if two students sign in at once)
  insert into public.institutions (name) values (v_college) returning id into v_new;
  insert into public.institution_domains (domain, institution_id) values (v_college, v_new)
    on conflict (domain) do nothing;
  select institution_id into v_inst from public.institution_domains where domain = v_college;
  if v_inst <> v_new then delete from public.institutions where id = v_new; end if;
  return v_inst;
end $$;
revoke execute on function public.resolve_institution_for_email(text) from public, anon, authenticated;

-- 4) Profile trigger (backstop + creates the profile). Keeps the demo-counsellor behaviour from 0003.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_inst uuid := public.resolve_institution_for_email(new.email);
begin
  if v_inst is null then
    raise exception 'Sign-in is limited to college email IDs ending in .ac.in.';
  end if;
  if exists (select 1 from public.institutions where id = v_inst and seed_demo) then
    perform public.seed_demo_counsellors(v_inst);
  end if;
  insert into public.profiles (id, full_name, avatar_url, institution_id)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url', v_inst);
  return new;
end $$;
