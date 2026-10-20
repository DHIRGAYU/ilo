-- Ilo phase 4: student notes, cancel, reschedule
-- Run after 0003_booking.sql

alter table public.appointments
  add column student_note  text check (student_note is null or char_length(student_note) <= 500),
  add column cancelled_at  timestamptz;

-- Shared slot rules (not callable from the app): in the future, inside working hours, on the 45-minute grid
create function public.assert_slot_bookable(p_counsellor_id uuid, p_starts_at timestamptz) returns void
language plpgsql stable security definer set search_path = '' as $$
declare v_local timestamp := p_starts_at at time zone 'Asia/Kolkata';
begin
  if p_starts_at < now() + interval '10 minutes' or p_starts_at > now() + interval '14 days' then
    raise exception 'slot_unavailable';
  end if;
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
end $$;
revoke execute on function public.assert_slot_bookable(uuid, timestamptz) from public, anon, authenticated;

-- book_appointment now takes an optional private note for the counsellor
drop function public.book_appointment(uuid, timestamptz, text);
create function public.book_appointment(p_counsellor_id uuid, p_starts_at timestamptz, p_mode text, p_note text default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_inst uuid := public.current_institution_id();
  v_id   uuid;
begin
  if v_uid is null or v_inst is null then raise exception 'not_allowed'; end if;
  if p_mode not in ('in_person','video','phone') then raise exception 'bad_mode'; end if;
  if not exists (select 1 from public.counsellors c
                 where c.id = p_counsellor_id and c.is_active and c.institution_id = v_inst) then
    raise exception 'not_allowed';
  end if;
  perform public.assert_slot_bookable(p_counsellor_id, p_starts_at);

  insert into public.appointments (student_id, counsellor_id, institution_id, starts_at, ends_at, mode, student_note)
  values (v_uid, p_counsellor_id, v_inst, p_starts_at, p_starts_at + interval '45 minutes', p_mode,
          nullif(left(btrim(coalesce(p_note, '')), 500), ''))
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'slot_taken';
end $$;
revoke execute on function public.book_appointment(uuid, timestamptz, text, text) from public, anon;
grant  execute on function public.book_appointment(uuid, timestamptz, text, text) to authenticated;

-- Cancel: only your own confirmed session, and only until 2 hours before it starts
create function public.cancel_appointment(p_appointment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.appointments
     set status = 'cancelled', cancelled_at = now()
   where id = p_appointment_id
     and student_id = (select auth.uid())
     and status = 'confirmed'
     and starts_at > now() + interval '2 hours';
  if not found then raise exception 'cannot_cancel'; end if;
end $$;
revoke execute on function public.cancel_appointment(uuid) from public, anon;
grant  execute on function public.cancel_appointment(uuid) to authenticated;

-- Reschedule: same counsellor, mode and note; the old slot is released and the new one taken, all or nothing
create function public.reschedule_appointment(p_appointment_id uuid, p_starts_at timestamptz) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_old public.appointments;
  v_new uuid;
begin
  select * into v_old from public.appointments
   where id = p_appointment_id and student_id = v_uid and status = 'confirmed' for update;
  if not found then raise exception 'cannot_reschedule'; end if;
  if v_old.starts_at <= now() + interval '2 hours' then raise exception 'too_late'; end if;
  if not exists (select 1 from public.counsellors c
                 where c.id = v_old.counsellor_id and c.is_active
                   and c.institution_id = public.current_institution_id()) then
    raise exception 'not_allowed';
  end if;
  perform public.assert_slot_bookable(v_old.counsellor_id, p_starts_at);

  update public.appointments set status = 'cancelled', cancelled_at = now() where id = v_old.id;
  insert into public.appointments (student_id, counsellor_id, institution_id, starts_at, ends_at, mode, student_note)
  values (v_uid, v_old.counsellor_id, v_old.institution_id, p_starts_at, p_starts_at + interval '45 minutes', v_old.mode, v_old.student_note)
  returning id into v_new;
  return v_new;
exception when unique_violation then
  raise exception 'slot_taken';
end $$;
revoke execute on function public.reschedule_appointment(uuid, timestamptz) from public, anon;
grant  execute on function public.reschedule_appointment(uuid, timestamptz) to authenticated;
