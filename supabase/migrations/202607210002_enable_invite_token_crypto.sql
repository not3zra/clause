-- Publish-time invite credentials need secure random bytes and a one-way hash.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create or replace function public.publish_room_version_with_invite(p_room_id uuid, p_marks_visible boolean)
returns table(invite_token text, marks_visible boolean, room_version_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_legacy record; v_assignment_id uuid; v_token text;
begin
  select * into v_legacy from public.publish_room_version(p_room_id, p_marks_visible);
  select id into v_assignment_id from public.assignments where room_id = p_room_id;
  v_token := encode(extensions.gen_random_bytes(32), 'base64');
  insert into public.assignment_invite_tokens (assignment_id, token_hash, expires_at)
  values (v_assignment_id, encode(extensions.digest(v_token, 'sha256'), 'hex'), now() + interval '30 days');
  return query select v_token, v_legacy.marks_visible, v_legacy.room_version_id;
end; $$;

grant execute on function public.publish_room_version_with_invite(uuid, boolean) to authenticated;
