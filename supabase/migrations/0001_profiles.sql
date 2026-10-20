-- Ilo phase 2a: institutions + profiles, created automatically on first Google sign-in

create table public.institutions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email_domain text unique,            -- e.g. 'mycollege.edu.in' to auto-link students
  created_at   timestamptz not null default now()
);

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  institution_id uuid references public.institutions (id),
  role           text not null default 'student'
                 check (role in ('student','counsellor','institution_admin','platform_admin')),
  full_name      text,
  avatar_url     text,
  created_at     timestamptz not null default now()
);

alter table public.institutions enable row level security;
alter table public.profiles     enable row level security;

-- A person can read only their own profile and their own institution
create policy "read own profile" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "read own institution" on public.institutions
  for select to authenticated using (
    id = (select institution_id from public.profiles where id = (select auth.uid()))
  );

-- Users may edit their name only. Role and institution can never be changed from the app.
revoke update on public.profiles from authenticated, anon;
grant  update (full_name) on public.profiles to authenticated;
create policy "update own name" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Create the profile when someone signs in for the first time.
-- Role is always 'student' here; staff roles are granted by the Ilo team in the dashboard.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url, institution_id)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    (select i.id from public.institutions i
      where i.email_domain = lower(split_part(new.email, '@', 2)))
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
