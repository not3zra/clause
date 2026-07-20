create or replace function public.enrol_student_with_session(
  p_assignment_id uuid, p_student_id uuid, p_full_name text, p_roll_number text, p_session_hash text, p_expires_at timestamptz
) returns table(student_assignment_id uuid, mission_attempt_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_assignment public.assignments%rowtype; v_enrolment uuid; v_attempt uuid;
begin
  select * into v_assignment from public.assignments where id = p_assignment_id for update;
  if v_assignment.id is null or not v_assignment.active or v_assignment.closed_at is not null or (v_assignment.invite_expires_at is not null and v_assignment.invite_expires_at <= now()) then raise exception 'Invite is unavailable'; end if;
  if v_assignment.seat_cap is not null and (select count(*) from public.student_assignments where assignment_id = p_assignment_id) >= v_assignment.seat_cap then raise exception 'This invite has reached its seat limit'; end if;
  insert into public.student_profiles (id, full_name, roll_number, username) values (p_student_id, left(trim(p_full_name), 120), left(trim(p_roll_number), 60), 's_' || substr(replace(p_student_id::text, '-', ''), 1, 28));
  insert into public.student_assignments (student_id, assignment_id) values (p_student_id, p_assignment_id) returning id into v_enrolment;
  insert into public.mission_attempts (student_assignment_id, room_version_id) select v_enrolment, published_room_version_id from public.assignments where id = p_assignment_id returning id into v_attempt;
  insert into public.student_sessions (student_assignment_id, token_hash, expires_at) values (v_enrolment, p_session_hash, p_expires_at);
  return query select v_enrolment, v_attempt;
end; $$;
