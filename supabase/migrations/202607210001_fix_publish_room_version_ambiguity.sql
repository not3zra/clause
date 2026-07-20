-- The output parameter room_version_id shadows an unqualified column name
-- inside this PL/pgSQL function. Qualify the column to keep publishing safe.
create or replace function public.publish_room_version(p_room_id uuid, p_marks_visible boolean)
returns table(invite_token uuid, marks_visible boolean, room_version_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_version public.room_versions%rowtype; v_assignment public.assignments%rowtype;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and teacher_id = auth.uid() and status = 'draft' and reviewed_at is not null and validated_at is not null) then raise exception 'Room is not ready to publish'; end if;
  select * into v_version from public.room_versions where room_id = p_room_id and published_at is null order by version_number desc limit 1 for update;
  if v_version.id is null or (select count(*) from public.room_stages where public.room_stages.room_version_id = v_version.id) <> v_version.stage_count then raise exception 'Room version must contain every stage before publishing'; end if;
  update public.room_versions set published_at = now() where id = v_version.id;
  update public.rooms set status = 'published', updated_at = now() where id = p_room_id;
  insert into public.assignments (room_id, teacher_id, marks_visible, published_room_version_id) values (p_room_id, auth.uid(), p_marks_visible, v_version.id) returning * into v_assignment;
  return query select v_assignment.invite_token, v_assignment.marks_visible, v_version.id;
end; $$;

grant execute on function public.publish_room_version(uuid, boolean) to authenticated;
