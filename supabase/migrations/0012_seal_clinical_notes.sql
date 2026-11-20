-- Seal booking notes and counsellor inbox notes. Chat encryption is unchanged.
-- Run after 0011_allow_ac_in.sql. Inbox sealing no-ops until conversation_flags exists.

alter table public.appointments
  add column if not exists student_note_ciphertext text,
  add column if not exists student_note_nonce text,
  add column if not exists student_note_sender_key text,
  add column if not exists student_note_id uuid;

alter table public.appointments drop constraint if exists appointments_student_note_sealed_ck;
alter table public.appointments add constraint appointments_student_note_sealed_ck check (
  (
    student_note_ciphertext is null
    and student_note_nonce is null
    and student_note_sender_key is null
    and student_note_id is null
  )
  or (
    student_note_ciphertext is not null
    and student_note_nonce is not null
    and student_note_sender_key is not null
    and student_note_id is not null
    and char_length(student_note_ciphertext) <= 12000
    and char_length(student_note_nonce) <= 200
    and char_length(student_note_sender_key) <= 128
  )
  or (
    -- A note that was stored in the clear, then sealed on the counsellor's device with their notes key.
    student_note_ciphertext is not null
    and student_note_nonce is not null
    and student_note_sender_key is null
    and student_note_id is null
    and char_length(student_note_ciphertext) <= 12000
    and char_length(student_note_nonce) <= 200
  )
);

-- Booking no longer accepts a plaintext note. The four sealed fields travel together, or not at all.
drop function if exists public.book_appointment(uuid, timestamptz, text, text);
create function public.book_appointment(
  p_counsellor_id uuid,
  p_starts_at timestamptz,
  p_mode text,
  p_note_ciphertext text default null,
  p_note_nonce text default null,
  p_note_sender_key text default null,
  p_note_id uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_uid  uuid := (select auth.uid());
  v_inst uuid := public.current_institution_id();
  v_id   uuid;
  v_sealed boolean := p_note_ciphertext is not null;
begin
  if v_uid is null or v_inst is null then raise exception 'not_allowed'; end if;
  if p_mode not in ('in_person','video','phone') then raise exception 'bad_mode'; end if;
  if (p_note_ciphertext is null) <> (p_note_nonce is null)
     or (p_note_ciphertext is null) <> (p_note_sender_key is null)
     or (p_note_ciphertext is null) <> (p_note_id is null) then
    raise exception 'bad_note';
  end if;
  if v_sealed and (
    char_length(p_note_ciphertext) > 12000
    or char_length(p_note_nonce) > 200
    or char_length(p_note_sender_key) > 128
    or char_length(p_note_ciphertext) = 0
  ) then
    raise exception 'bad_note';
  end if;
  if not exists (select 1 from public.counsellors c
                 where c.id = p_counsellor_id and c.is_active and c.institution_id = v_inst) then
    raise exception 'not_allowed';
  end if;
  perform public.assert_slot_bookable(p_counsellor_id, p_starts_at);

  insert into public.appointments (
    student_id, counsellor_id, institution_id, starts_at, ends_at, mode,
    student_note, student_note_ciphertext, student_note_nonce, student_note_sender_key, student_note_id
  )
  values (
    v_uid, p_counsellor_id, v_inst, p_starts_at, p_starts_at + interval '45 minutes', p_mode,
    null, p_note_ciphertext, p_note_nonce, p_note_sender_key, p_note_id
  )
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'slot_taken';
end $$;
revoke execute on function public.book_appointment(uuid, timestamptz, text, text, text, text, uuid) from public, anon;
grant  execute on function public.book_appointment(uuid, timestamptz, text, text, text, text, uuid) to authenticated;

-- Reschedule keeps the sealed note. A leftover plaintext note moves once, onto the new row, so it can be sealed there.
create or replace function public.reschedule_appointment(p_appointment_id uuid, p_starts_at timestamptz) returns uuid
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

  update public.appointments
     set status = 'cancelled', cancelled_at = now(), student_note = null
   where id = v_old.id;
  insert into public.appointments (
    student_id, counsellor_id, institution_id, starts_at, ends_at, mode,
    student_note, student_note_ciphertext, student_note_nonce, student_note_sender_key, student_note_id
  )
  values (
    v_uid, v_old.counsellor_id, v_old.institution_id, p_starts_at, p_starts_at + interval '45 minutes', v_old.mode,
    case when v_old.student_note_ciphertext is null then v_old.student_note else null end,
    v_old.student_note_ciphertext, v_old.student_note_nonce, v_old.student_note_sender_key, v_old.student_note_id
  )
  returning id into v_new;
  return v_new;
exception when unique_violation then
  raise exception 'slot_taken';
end $$;

-- The counsellor's device seals an old plaintext booking note, then the clear copy is removed.
create or replace function public.seal_student_booking_note(
  p_appointment_id uuid,
  p_ciphertext text,
  p_nonce text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid;
begin
  select c.id into v_me from public.counsellors c where c.profile_id = (select auth.uid());
  if v_me is null then raise exception 'not_allowed'; end if;
  if p_ciphertext is null or p_nonce is null
     or char_length(p_ciphertext) = 0 or char_length(p_ciphertext) > 12000
     or char_length(p_nonce) = 0 or char_length(p_nonce) > 200 then
    raise exception 'bad_note';
  end if;
  update public.appointments
     set student_note_ciphertext = p_ciphertext,
         student_note_nonce = p_nonce,
         student_note_sender_key = null,
         student_note_id = null,
         student_note = null
   where id = p_appointment_id
     and counsellor_id = v_me
     and student_note is not null
     and student_note_ciphertext is null;
  if not found then raise exception 'not_allowed'; end if;
end $$;
revoke execute on function public.seal_student_booking_note(uuid, text, text) from public, anon;
grant  execute on function public.seal_student_booking_note(uuid, text, text) to authenticated;

do $mig$
begin
  if to_regclass('public.conversation_flags') is null then
    raise notice 'conversation_flags is not in this database yet; inbox note sealing waits for that table';
    return;
  end if;
  execute 'alter table public.conversation_flags add column if not exists note_ciphertext text';
  execute 'alter table public.conversation_flags add column if not exists note_nonce text';
end
$mig$;

-- Replaces the plaintext note writer. Both values are set, or both are null to clear the note.
drop function if exists public.save_conversation_note(uuid, text);
create or replace function public.save_conversation_note(
  p_conversation_id uuid,
  p_note_ciphertext text,
  p_note_nonce text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid;
begin
  select c.id into v_me from public.counsellors c where c.profile_id = (select auth.uid());
  if v_me is null then raise exception 'not_allowed'; end if;
  if (p_note_ciphertext is null) <> (p_note_nonce is null) then raise exception 'bad_note'; end if;
  if p_note_ciphertext is not null and (
    char_length(p_note_ciphertext) = 0 or char_length(p_note_ciphertext) > 12000
    or char_length(p_note_nonce) = 0 or char_length(p_note_nonce) > 200
  ) then
    raise exception 'bad_note';
  end if;
  if to_regclass('public.conversations') is not null
     and not exists (
       select 1 from public.conversations conv
        where conv.id = p_conversation_id and conv.counsellor_id = v_me
     ) then
    raise exception 'not_allowed';
  end if;

  update public.conversation_flags
     set note_ciphertext = p_note_ciphertext,
         note_nonce = p_note_nonce,
         note = ''
   where conversation_id = p_conversation_id
     and counsellor_id = v_me;
  if found then return; end if;

  insert into public.conversation_flags (
    conversation_id, counsellor_id, pinned, urgent, archived, resolved, note, note_ciphertext, note_nonce
  )
  values (
    p_conversation_id, v_me, false, false, false, false, '', p_note_ciphertext, p_note_nonce
  );
end $$;
revoke execute on function public.save_conversation_note(uuid, text, text) from public, anon;
grant  execute on function public.save_conversation_note(uuid, text, text) to authenticated;
