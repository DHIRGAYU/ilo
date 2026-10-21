-- Ilo phase 9: audio and video calls (Daily.co)
-- Mirrors 0005_calls.sql

-- 1) Calls table (create if not already exists)
create table if not exists public.calls (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  appointment_id  uuid references public.appointments (id) on delete set null,
  kind            text not null check (kind in ('audio','video')),
  initiated_by    text not null check (initiated_by in ('student','counsellor')),
  initiator_id    uuid not null,
  status          text not null default 'ringing' check (status in ('ringing','active','ended','missed','declined')),
  room_name       text not null unique,
  created_at      timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz
);

create index if not exists calls_by_conversation on public.calls (conversation_id, created_at desc);

alter table public.calls enable row level security;
alter table public.calls replica identity full;
revoke all on public.calls from anon;
revoke insert, update, delete on public.calls from authenticated;   -- every change goes through the functions below

-- 2) Helper function: resolves the counsellor id for the signed-in user
create or replace function public.my_counsellor_id() returns uuid
language sql stable security definer set search_path = public, pg_catalog as $$
  select id from public.counsellors where profile_id = (select auth.uid()) limit 1;
$$;
revoke execute on function public.my_counsellor_id() from public, anon;
grant  execute on function public.my_counsellor_id() to authenticated;

-- 3) RLS Policy: Both participants (student and counsellor) and the call initiator can see call updates
drop policy if exists "parties read their calls" on public.calls;
create policy "parties read their calls" on public.calls
  for select to authenticated using (
    initiator_id = (select auth.uid())
    or exists (
      select 1 from public.conversations cv
      where cv.id = conversation_id
        and (
          cv.student_id = (select auth.uid())
          or cv.counsellor_id in (select c.id from public.counsellors c where c.profile_id = (select auth.uid()))
        )
    )
  );

-- 4) Who is on the call, and what the screen should call them
create or replace function public.call_context(p_call_id uuid) returns jsonb
language plpgsql stable security definer set search_path = public, pg_catalog as $$
declare
  v_uid   uuid := (select auth.uid());
  v_call  public.calls;
  v_conv  public.conversations;
  v_role  text;
  v_cname text;
  v_sname text;
begin
  select * into v_call from public.calls where id = p_call_id;
  if not found then raise exception 'not_allowed'; end if;

  select * into v_conv from public.conversations where id = v_call.conversation_id;
  if not found then raise exception 'not_allowed'; end if;

  if v_conv.student_id = v_uid then
    v_role := 'student';
  elsif exists (select 1 from public.counsellors c where c.id = v_conv.counsellor_id and c.profile_id = v_uid) then
    v_role := 'counsellor';
  else
    raise exception 'not_allowed';
  end if;

  select coalesce(nullif(trim(display_name), ''), 'Counsellor') into v_cname
    from public.counsellors where id = v_conv.counsellor_id;
  select coalesce(nullif(trim(full_name), ''), 'Student') into v_sname
    from public.profiles where id = v_conv.student_id;

  return jsonb_build_object(
    'role', v_role,
    'kind', v_call.kind,
    'status', v_call.status,
    'room_name', v_call.room_name,
    'initiated_by', v_call.initiated_by,
    'created_at', v_call.created_at,
    'my_name',   case when v_role = 'student' then v_sname else v_cname end,
    'peer_name', case when v_role = 'student' then v_cname else v_sname end
  );
end $$;

-- 5) Start a call, or join the one already open on this conversation
create or replace function public.start_call(p_conversation_id uuid, p_counsellor_id uuid, p_appointment_id uuid, p_kind text, p_room_name text)
returns jsonb
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid  uuid := (select auth.uid());
  v_inst uuid := public.current_institution_id();
  v_conv public.conversations;
  v_appt public.appointments;
  v_call public.calls;
  v_role text;
begin
  if v_uid is null then raise exception 'not_allowed'; end if;
  if p_kind not in ('audio','video') then raise exception 'bad_kind'; end if;

  if p_appointment_id is not null then
    -- a booked session: either side, from 15 minutes before it starts until 30 minutes after it ends
    select * into v_appt from public.appointments
     where id = p_appointment_id and status = 'confirmed'
       and (student_id = v_uid or counsellor_id in (select id from public.counsellors where profile_id = v_uid));
    if not found then raise exception 'not_allowed'; end if;
    if now() < v_appt.starts_at - interval '15 minutes' or now() > v_appt.ends_at + interval '30 minutes' then
      raise exception 'too_early';
    end if;

    select * into v_conv from public.conversations
     where student_id = v_appt.student_id and counsellor_id = v_appt.counsellor_id;
    if not found then
      insert into public.conversations (student_id, counsellor_id, institution_id)
      values (v_appt.student_id, v_appt.counsellor_id, v_appt.institution_id)
      returning * into v_conv;
    end if;

  elsif p_conversation_id is not null then
    select * into v_conv from public.conversations
     where id = p_conversation_id
       and (student_id = v_uid or counsellor_id in (select id from public.counsellors where profile_id = v_uid));
    if not found then raise exception 'not_allowed'; end if;

  elsif p_counsellor_id is not null then
    -- a student calling a counsellor from the chat screen
    if not exists (select 1 from public.counsellors c
                   where c.id = p_counsellor_id and c.is_active
                     and (v_inst is null or c.institution_id = v_inst)) then
      raise exception 'not_allowed';
    end if;

    v_inst := coalesce(v_inst, (select institution_id from public.counsellors where id = p_counsellor_id));

    select * into v_conv from public.conversations where student_id = v_uid and counsellor_id = p_counsellor_id;
    if not found then
      insert into public.conversations (student_id, counsellor_id, institution_id)
      values (v_uid, p_counsellor_id, v_inst)
      returning * into v_conv;
    end if;

  else
    raise exception 'not_allowed';
  end if;

  v_role := case when v_conv.student_id = v_uid then 'student' else 'counsellor' end;

  -- tidy up calls nobody answered or closed
  update public.calls set status = 'missed', ended_at = now()
   where status = 'ringing' and created_at < now() - interval '60 seconds';
  update public.calls set status = 'ended', ended_at = now()
   where status = 'active' and created_at < now() - interval '4 hours';

  -- a call is already open: join it (if the other side was ringing us, that counts as answering)
  select * into v_call from public.calls
   where conversation_id = v_conv.id and status in ('ringing','active')
   order by created_at desc limit 1;
  if found then
    if v_call.status = 'ringing' and v_call.initiated_by <> v_role then
      update public.calls set status = 'active', answered_at = now() where id = v_call.id returning * into v_call;
    end if;
    return jsonb_build_object('call_id', v_call.id, 'room_name', v_call.room_name, 'kind', v_call.kind,
                              'role', v_role, 'status', v_call.status, 'created', false);
  end if;

  if (select count(*) from public.calls where initiator_id = v_uid and created_at > now() - interval '10 minutes') >= 8 then
    raise exception 'rate_limited';
  end if;

  insert into public.calls (conversation_id, appointment_id, kind, initiated_by, initiator_id, room_name)
  values (v_conv.id, p_appointment_id, p_kind, v_role, v_uid, p_room_name)
  returning * into v_call;

  return jsonb_build_object('call_id', v_call.id, 'room_name', v_call.room_name, 'kind', v_call.kind,
                            'role', v_role, 'status', v_call.status, 'created', true);
end $$;

-- 6) The person being called says yes or no
create or replace function public.answer_call(p_call_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_ctx jsonb := public.call_context(p_call_id);
begin
  if v_ctx ->> 'initiated_by' = v_ctx ->> 'role' or v_ctx ->> 'status' <> 'ringing' then
    raise exception 'not_allowed';
  end if;
  update public.calls
     set status = case when p_accept then 'active' else 'declined' end,
         answered_at = case when p_accept then now() else answered_at end,
         ended_at = case when p_accept then null else now() end
   where id = p_call_id and status = 'ringing';
end $$;

-- 7) Hang up (or cancel while it is still ringing)
create or replace function public.end_call(p_call_id uuid) returns void
language plpgsql security definer set search_path = public, pg_catalog as $$
begin
  update public.calls
     set status = case when status = 'ringing' then 'missed' else 'ended' end,
         ended_at = now()
   where id = p_call_id and status in ('ringing','active');
end $$;

-- Permissions
revoke execute on function public.start_call(uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.call_context(uuid)                       from public, anon;
revoke execute on function public.answer_call(uuid, boolean)               from public, anon;
revoke execute on function public.end_call(uuid)                           from public, anon;
grant  execute on function public.start_call(uuid, uuid, uuid, text, text) to authenticated;
grant  execute on function public.call_context(uuid)                       to authenticated;
grant  execute on function public.answer_call(uuid, boolean)               to authenticated;
grant  execute on function public.end_call(uuid)                           to authenticated;

-- Realtime publication
do $$ begin
  alter publication supabase_realtime add table public.calls;
exception when duplicate_object then null;
end $$;
