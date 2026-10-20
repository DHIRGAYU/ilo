-- Ilo phase 5: counsellor messages & read tracking
-- Run in Supabase SQL editor after 0004_sessions.sql

-- 1) Grant insert on messages table to authenticated role
grant insert on public.messages to authenticated;

-- 2) RLS policy for counsellors inserting messages
drop policy if exists "counsellors insert messages" on public.messages;
create policy "counsellors insert messages" on public.messages
  for insert to authenticated
  with check (
    sender_role = 'counsellor' and
    exists (
      select 1 from public.conversations c
      join public.counsellors co on co.id = c.counsellor_id
      where c.id = conversation_id and co.profile_id = (select auth.uid())
    )
  );

-- 3) Allow counsellors to update read timestamps on their conversations
drop policy if exists "counsellors update own conversations" on public.conversations;
create policy "counsellors update own conversations" on public.conversations
  for update to authenticated
  using (
    exists (
      select 1 from public.counsellors co
      where co.id = counsellor_id and co.profile_id = (select auth.uid())
    )
  );
grant update (counsellor_last_read_at) on public.conversations to authenticated;

-- 4) Security Definer function for counsellor sending (matching send_message)
create or replace function public.counsellor_send_message(
  p_conversation_id uuid,
  p_body text,
  p_client_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_counsellor_id uuid;
  v_msg_id uuid;
  v_created_at timestamptz;
begin
  if v_uid is null then raise exception 'not_allowed'; end if;

  select id into v_counsellor_id
  from public.counsellors
  where profile_id = v_uid;

  if v_counsellor_id is null then raise exception 'not_counsellor'; end if;

  if not exists (
    select 1 from public.conversations
    where id = p_conversation_id and counsellor_id = v_counsellor_id
  ) then
    raise exception 'conversation_not_found';
  end if;

  insert into public.messages (conversation_id, sender_role, body, client_id)
  values (p_conversation_id, 'counsellor', left(p_body, 2000), p_client_id)
  returning id, created_at into v_msg_id, v_created_at;

  update public.conversations
  set counsellor_last_read_at = v_created_at
  where id = p_conversation_id;

  return jsonb_build_object('id', v_msg_id, 'created_at', v_created_at);
end;
$$;

revoke execute on function public.counsellor_send_message(uuid, text, text) from public, anon;
grant  execute on function public.counsellor_send_message(uuid, text, text) to authenticated;

-- 5) Allow counsellors to view profiles of students (so student names are visible on counsellor side)
drop policy if exists "counsellors read student profiles" on public.profiles;
create policy "counsellors read student profiles" on public.profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.counsellors co
      where co.profile_id = (select auth.uid())
      and (
        co.institution_id = public.profiles.institution_id
        or exists (select 1 from public.conversations c where c.counsellor_id = co.id and c.student_id = public.profiles.id)
        or exists (select 1 from public.appointments a where a.counsellor_id = co.id and a.student_id = public.profiles.id)
      )
    )
  );

-- 6) Security definer function to get student names for counsellor as a resilient fallback
create or replace function public.get_student_profiles_for_counsellor(p_student_ids uuid[])
returns table (id uuid, full_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if not exists (select 1 from public.counsellors where profile_id = v_uid) then
    raise exception 'not_counsellor';
  end if;

  return query
  select p.id, p.full_name
  from public.profiles p
  where p.id = any(p_student_ids);
end;
$$;

revoke execute on function public.get_student_profiles_for_counsellor(uuid[]) from public, anon;
grant  execute on function public.get_student_profiles_for_counsellor(uuid[]) to authenticated;
