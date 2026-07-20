-- Password-free student enrolment. Raw invite and session tokens never enter the database.
alter table public.assignments add column invite_token_hash text;
alter table public.assignments add column invite_expires_at timestamptz;
alter table public.assignments add column seat_cap integer check (seat_cap is null or seat_cap > 0);
alter table public.assignments add column closed_at timestamptz;

create table public.assignment_invite_tokens (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index assignment_invite_tokens_active_idx on public.assignment_invite_tokens (assignment_id, expires_at) where revoked_at is null;
alter table public.assignment_invite_tokens enable row level security;
grant all on public.assignment_invite_tokens to service_role;

create or replace function public.publish_room_version_with_invite(p_room_id uuid, p_marks_visible boolean)
returns table(invite_token text, marks_visible boolean, room_version_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_legacy record; v_assignment_id uuid; v_token text;
begin
  select * into v_legacy from public.publish_room_version(p_room_id, p_marks_visible);
  select id into v_assignment_id from public.assignments where room_id = p_room_id;
  v_token := encode(gen_random_bytes(32), 'base64');
  insert into public.assignment_invite_tokens (assignment_id, token_hash, expires_at)
  values (v_assignment_id, encode(digest(v_token, 'sha256'), 'hex'), now() + interval '30 days');
  return query select v_token, v_legacy.marks_visible, v_legacy.room_version_id;
end; $$;
grant execute on function public.publish_room_version_with_invite(uuid, boolean) to authenticated;

create table public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  student_assignment_id uuid not null references public.student_assignments (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index student_sessions_active_idx on public.student_sessions (student_assignment_id, expires_at) where revoked_at is null;

alter table public.student_sessions enable row level security;
-- Sessions are intentionally server-only; no authenticated or anonymous table access.
revoke all on public.student_sessions from anon, authenticated;
grant all on public.student_sessions to service_role;

create or replace function public.enrol_student_with_session(
  p_assignment_id uuid, p_student_id uuid, p_full_name text, p_roll_number text, p_session_hash text, p_expires_at timestamptz
) returns table(student_assignment_id uuid, mission_attempt_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_assignment public.assignments%rowtype; v_enrolment uuid; v_attempt uuid;
begin
  select * into v_assignment from public.assignments where id = p_assignment_id for update;
  if v_assignment.id is null or not v_assignment.active or v_assignment.closed_at is not null or (v_assignment.invite_expires_at is not null and v_assignment.invite_expires_at <= now()) then raise exception 'Invite is unavailable'; end if;
  if v_assignment.seat_cap is not null and (select count(*) from public.student_assignments where assignment_id = p_assignment_id) >= v_assignment.seat_cap then raise exception 'This invite has reached its seat limit'; end if;
  insert into public.student_profiles (id, full_name, roll_number, username) values (p_student_id, left(trim(p_full_name), 120), left(trim(p_roll_number), 60), 'session_' || replace(p_student_id::text, '-', ''));
  insert into public.student_assignments (student_id, assignment_id) values (p_student_id, p_assignment_id) returning id into v_enrolment;
  insert into public.mission_attempts (student_assignment_id, room_version_id) select v_enrolment, published_room_version_id from public.assignments where id = p_assignment_id returning id into v_attempt;
  insert into public.student_sessions (student_assignment_id, token_hash, expires_at) values (v_enrolment, p_session_hash, p_expires_at);
  return query select v_enrolment, v_attempt;
end; $$;

grant execute on function public.enrol_student_with_session(uuid, uuid, text, text, text, timestamptz) to service_role;

create or replace function public.submit_session_mission_item(
  p_session_hash text, p_attempt_id uuid, p_stage_id uuid, p_answer jsonb, p_verdict text,
  p_recommendation jsonb, p_source text, p_provisional_credit boolean,
  p_credit_awarded boolean, p_hint_used boolean, p_idempotency_key text
) returns public.mission_item_attempts
language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  select sa.student_id into v_student_id
  from public.student_sessions ss join public.student_assignments sa on sa.id = ss.student_assignment_id
  where ss.token_hash = p_session_hash and ss.revoked_at is null and ss.expires_at > now()
    and exists (select 1 from public.mission_attempts ma where ma.id = p_attempt_id and ma.student_assignment_id = ss.student_assignment_id);
  if v_student_id is null then raise exception 'Student session expired'; end if;
  perform set_config('request.jwt.claim.sub', v_student_id::text, true);
  return public.submit_mission_item(p_attempt_id, p_stage_id, p_answer, p_verdict, p_recommendation, p_source, p_provisional_credit, p_credit_awarded, p_hint_used, p_idempotency_key);
end; $$;
grant execute on function public.submit_session_mission_item(text, uuid, uuid, jsonb, text, jsonb, text, boolean, boolean, boolean, text) to service_role;

create or replace function public.close_assignment_invite(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.assignments where id = p_assignment_id and teacher_id = auth.uid()) then raise exception 'Assignment not found'; end if;
  update public.assignments set active = false, closed_at = now() where id = p_assignment_id;
  update public.assignment_invite_tokens set revoked_at = now() where assignment_id = p_assignment_id and revoked_at is null;
  update public.student_sessions ss set revoked_at = now()
  from public.student_assignments sa
  where ss.student_assignment_id = sa.id and sa.assignment_id = p_assignment_id and ss.revoked_at is null;
end; $$;
grant execute on function public.close_assignment_invite(uuid) to authenticated;
