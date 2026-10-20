-- Ilo phase 2b: college-email-only sign-in + campus counsellors
-- Run after 0001_profiles.sql

-- 1) A college can have several email domains (e.g. students.college.edu.in and college.edu.in)
create table public.institution_domains (
  domain         text primary key check (domain = lower(domain) and domain not like '%@%'),
  institution_id uuid not null references public.institutions (id) on delete cascade
);
alter table public.institution_domains enable row level security;  -- no policies: only server-side functions read it

insert into public.institution_domains (domain, institution_id)
  select email_domain, id from public.institutions where email_domain is not null;
alter table public.institutions drop column email_domain;

-- 2) Helpers
create function public.current_institution_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select institution_id from public.profiles where id = (select auth.uid())
$$;
revoke execute on function public.current_institution_id() from public, anon;
grant  execute on function public.current_institution_id() to authenticated;

create function public.institution_for_email(p_email text) returns uuid
language sql stable security definer set search_path = '' as $$
  select institution_id from public.institution_domains
  where domain = lower(split_part(p_email, '@', 2))
$$;
revoke execute on function public.institution_for_email(text) from public, anon, authenticated;

drop policy "read own institution" on public.institutions;
create policy "read own institution" on public.institutions
  for select to authenticated using (id = public.current_institution_id());

-- 3) Block sign-ups from unregistered emails (Auth Hook: "Before User Created")
create function public.hook_before_user_created(event jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.institution_for_email(event -> 'user' ->> 'email') is null then
    return jsonb_build_object('error', jsonb_build_object(
      'message', 'Sign-in is limited to registered college email IDs.',
      'http_code', 403));
  end if;
  return '{}'::jsonb;
end $$;
grant usage on schema public to supabase_auth_admin;
grant  execute on function public.hook_before_user_created(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_before_user_created(jsonb) from authenticated, anon, public;

-- 4) Backstop: even if the hook is switched off, the profile trigger refuses unknown domains
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_inst uuid := public.institution_for_email(new.email);
begin
  if v_inst is null then
    raise exception 'Sign-in is limited to registered college email IDs.';
  end if;
  insert into public.profiles (id, full_name, avatar_url, institution_id)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url', v_inst);
  return new;
end $$;

-- 5) Campus counsellors and their weekly availability
create table public.counsellors (
  profile_id     uuid primary key references public.profiles (id) on delete cascade,
  institution_id uuid not null references public.institutions (id),
  display_name   text not null,                 -- e.g. 'Dr. Mira Nair'
  is_active      boolean not null default true
);
create table public.counsellor_availability (
  id            uuid primary key default gen_random_uuid(),
  counsellor_id uuid not null references public.counsellors (profile_id) on delete cascade,
  weekday       smallint not null check (weekday between 1 and 7),   -- 1 = Monday ... 7 = Sunday
  start_time    time not null,
  end_time      time not null check (end_time > start_time)
);
alter table public.counsellors enable row level security;
alter table public.counsellor_availability enable row level security;

create policy "see counsellors of my college" on public.counsellors
  for select to authenticated
  using (is_active and institution_id = public.current_institution_id());

create policy "see availability of my college" on public.counsellor_availability
  for select to authenticated
  using (exists (select 1 from public.counsellors c
                 where c.profile_id = counsellor_id and c.is_active
                   and c.institution_id = public.current_institution_id()));

-- Run from the SQL editor only (not callable by app users): makes a signed-in user a counsellor
create function public.promote_to_counsellor(p_email text, p_display_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No user with that email. Ask them to sign in once first.';
  end if;
  update public.profiles set role = 'counsellor' where id = v_id;
  insert into public.counsellors (profile_id, institution_id, display_name)
    select id, institution_id, p_display_name from public.profiles where id = v_id
  on conflict (profile_id) do update set display_name = excluded.display_name;
end $$;
revoke execute on function public.promote_to_counsellor(text, text) from public, anon, authenticated;
