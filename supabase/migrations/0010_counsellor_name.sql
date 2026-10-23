-- Ilo: let a signed-in counsellor set the name shown to students and in their workspace.
-- Run this in the Supabase SQL Editor.
--
-- A narrow function is used instead of an UPDATE policy, so a counsellor can change
-- only their own display name (never institution_id, is_active, etc.).

create or replace function public.set_my_counsellor_name(p_name text) returns text
language plpgsql security definer set search_path = public, pg_catalog as $$
declare
  v_uid  uuid := (select auth.uid());
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
begin
  if v_uid is null then raise exception 'not_allowed'; end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'bad_name'; end if;

  update public.counsellors set display_name = v_name where profile_id = v_uid;
  if not found then raise exception 'not_allowed'; end if;

  return v_name;
end $$;

revoke execute on function public.set_my_counsellor_name(text) from public, anon;
grant  execute on function public.set_my_counsellor_name(text) to authenticated;
