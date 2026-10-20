-- Ilo phase 3: demo counsellors, appointments, safe booking
-- Run after 0002_college_only.sql

-- 1) Counsellors no longer need a login: they get their own id (profile_id becomes optional)
drop policy "see availability of my college" on public.counsellor_availability;
alter table public.counsellor_availability drop constraint counsellor_availability_counsellor_id_fkey;
alter table public.counsellors drop constraint counsellors_pkey;
alter table public.counsellors add column id uuid not null default gen_random_uuid();
alter table public.counsellors add primary key (id);
alter table public.counsellors alter column profile_id drop not null;
alter table public.counsellors add constraint counsellors_profile_id_key unique (profile_id);
update public.counsellor_availability a set counsellor_id = c.id
  from public.counsellors c where c.profile_id = a.counsellor_id;
alter table public.counsellor_availability
  add constraint counsellor_availability_counsellor_id_fkey
  foreign key (counsellor_id) references public.counsellors (id) on delete cascade;
create policy "see availability of my college" on public.counsellor_availability
  for select to authenticated
  using (exists (select 1 from public.counsellors c
                 where c.id = counsellor_id and c.is_active
                   and c.institution_id = public.current_institution_id()));

alter table public.counsellors
  add column qualification text,                       -- 'M.Phil'
  add column designation   text,                       -- 'Lead Campus Counsellor'
  add column languages     text[] not null default '{}',
  add column room          text,
  add column sort_order    smallint not null default 0;

-- 2) Appointments: students see only their own. All writes go through book_appointment().
create table public.appointments (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.profiles (id) on delete cascade,
  counsellor_id  uuid not null references public.counsellors (id),
  institution_id uuid not null references public.institutions (id),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  mode           text not null check (mode in ('in_person','video','phone')),
  status         text not null default 'confirmed' check (status in ('confirmed','cancelled','completed')),
  created_at     timestamptz not null default now()
);
create unique index appointments_one_per_slot    on public.appointments (counsellor_id, starts_at) where status = 'confirmed';
create unique index appointments_one_per_student on public.appointments (student_id, starts_at)    where status = 'confirmed';
alter table public.appointments enable row level security;
revoke all on public.appointments from anon;
revoke insert, update, delete on public.appointments from authenticated;

create policy "students read own appointments" on public.appointments
  for select to authenticated using (student_id = (select auth.uid()));
create policy "counsellors read their appointments" on public.appointments
  for select to authenticated using (exists (
    select 1 from public.counsellors c where c.id = counsellor_id and c.profile_id = (select auth.uid())));

-- 3) Which slots are taken? Returns times only, never who booked them.
create function public.get_booked_slots(p_counsellor_id uuid, p_from timestamptz, p_to timestamptz)
returns setof timestamptz
language sql stable security definer set search_path = '' as $$
  select a.starts_at
  from public.appointments a
  join public.counsellors c on c.id = a.counsellor_id
  where a.counsellor_id = p_counsellor_id
    and a.status = 'confirmed'
    and c.institution_id = public.current_institution_id()
    and a.starts_at >= p_from and a.starts_at < p_to
$$;
revoke execute on function public.get_booked_slots(uuid, timestamptz, timestamptz) from public, anon;
grant  execute on function public.get_booked_slots(uuid, timestamptz, timestamptz) to authenticated;

-- 4) Book a 45-minute session. Every rule is checked here, not in the browser.
create function public.book_appointment(p_counsellor_id uuid, p_starts_at timestamptz, p_mode text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid   uuid := (select auth.uid());
  v_inst  uuid := public.current_institution_id();
  v_local timestamp := p_starts_at at time zone 'Asia/Kolkata';
  v_id    uuid;
begin
  if v_uid is null or v_inst is null then raise exception 'not_allowed'; end if;
  if p_mode not in ('in_person','video','phone') then raise exception 'bad_mode'; end if;
  if not exists (select 1 from public.counsellors c
                 where c.id = p_counsellor_id and c.is_active and c.institution_id = v_inst) then
    raise exception 'not_allowed';
  end if;
  if p_starts_at < now() + interval '10 minutes' or p_starts_at > now() + interval '14 days' then
    raise exception 'slot_unavailable';
  end if;
  -- must sit exactly on the counsellor's 45-minute grid inside a working window
  if not exists (
    select 1 from public.counsellor_availability a
    where a.counsellor_id = p_counsellor_id
      and a.weekday = extract(isodow from v_local)
      and v_local::time >= a.start_time
      and v_local::time + interval '45 minutes' <= a.end_time
      and mod(extract(epoch from (v_local::time - a.start_time))::int, 2700) = 0
  ) then
    raise exception 'slot_unavailable';
  end if;

  insert into public.appointments (student_id, counsellor_id, institution_id, starts_at, ends_at, mode)
  values (v_uid, p_counsellor_id, v_inst, p_starts_at, p_starts_at + interval '45 minutes', p_mode)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'slot_taken';
end $$;
revoke execute on function public.book_appointment(uuid, timestamptz, text) from public, anon;
grant  execute on function public.book_appointment(uuid, timestamptz, text) to authenticated;

-- 5) Demo counsellors, added automatically when a student at a demo college signs in
alter table public.institutions add column seed_demo boolean not null default false;

create function public.seed_demo_counsellors(p_institution uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare m uuid; a uuid; k uuid;
begin
  if exists (select 1 from public.counsellors where institution_id = p_institution) then return; end if;

  insert into public.counsellors (institution_id, display_name, qualification, designation, languages, room, sort_order)
  values (p_institution, 'Dr. Meera Sen', 'M.Phil', 'Lead Campus Counsellor',
          '{English,Hindi,Marathi}', 'Room 204, Student Wellness Wing, Block B', 1) returning id into m;
  insert into public.counsellors (institution_id, display_name, qualification, designation, languages, room, sort_order)
  values (p_institution, 'Dr. Ananya Roy', 'Ph.D', 'Senior Clinical Psychologist',
          '{English,Hindi,Bengali}', 'Room 206, Student Wellness Wing', 2) returning id into a;
  insert into public.counsellors (institution_id, display_name, qualification, designation, languages, room, sort_order)
  values (p_institution, 'Mr. Kabir Nair', 'M.A.', 'Campus Counsellor & Youth Facilitator',
          '{English,Hindi,Malayalam}', 'Room 202, Student Wellness Wing', 3) returning id into k;

  insert into public.counsellor_availability (counsellor_id, weekday, start_time, end_time)
    select m, d, '14:30', '17:30' from generate_series(1, 5) d;   -- Mon-Fri
  insert into public.counsellor_availability (counsellor_id, weekday, start_time, end_time)
    select a, d, '10:00', '13:00' from generate_series(1, 6) d;   -- Mon-Sat
  insert into public.counsellor_availability (counsellor_id, weekday, start_time, end_time)
    select k, d, '11:00', '16:00' from generate_series(2, 6) d;   -- Tue-Sat
end $$;
revoke execute on function public.seed_demo_counsellors(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_inst uuid := public.institution_for_email(new.email);
begin
  if v_inst is null then
    raise exception 'Sign-in is limited to registered college email IDs.';
  end if;
  if exists (select 1 from public.institutions where id = v_inst and seed_demo) then
    perform public.seed_demo_counsellors(v_inst);
  end if;
  insert into public.profiles (id, full_name, avatar_url, institution_id)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url', v_inst);
  return new;
end $$;

-- Turn demo mode on for the colleges you already have, and add the 3 counsellors now.
-- Set seed_demo = false for real colleges before real students use Ilo.
update public.institutions set seed_demo = true;
select public.seed_demo_counsellors(id) from public.institutions where seed_demo;
