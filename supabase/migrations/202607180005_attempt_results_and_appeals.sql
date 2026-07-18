alter table public.mission_attempts
  add column stage_results jsonb not null default '{}'::jsonb;

create table public.appeals (
  id uuid primary key default gen_random_uuid(),
  mission_attempt_id uuid not null references public.mission_attempts (id) on delete cascade,
  stage_id text not null check (stage_id in ('surgery', 'sort', 'rewrite')),
  student_explanation text not null default '' check (char_length(student_explanation) <= 1000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'denied', 'overridden')),
  teacher_comment text not null default '' check (char_length(teacher_comment) <= 1000),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index appeals_attempt_id_idx on public.appeals (mission_attempt_id, created_at desc);

alter table public.appeals enable row level security;

create policy "students can create their appeals"
on public.appeals for insert to authenticated
with check (exists (
  select 1 from public.mission_attempts ma
  join public.student_assignments sa on sa.id = ma.student_assignment_id
  where ma.id = mission_attempt_id and sa.student_id = auth.uid()
));

create policy "students can view their appeals"
on public.appeals for select to authenticated
using (exists (
  select 1 from public.mission_attempts ma
  join public.student_assignments sa on sa.id = ma.student_assignment_id
  where ma.id = mission_attempt_id and sa.student_id = auth.uid()
));

create policy "teachers can view assigned student profiles"
on public.student_profiles for select to authenticated
using (exists (
  select 1 from public.student_assignments sa
  join public.assignments a on a.id = sa.assignment_id
  join public.rooms r on r.id = a.room_id
  where sa.student_id = student_profiles.id and r.teacher_id = auth.uid()
));

create policy "teachers can view their assignment enrolments"
on public.student_assignments for select to authenticated
using (exists (
  select 1 from public.assignments a
  join public.rooms r on r.id = a.room_id
  where a.id = assignment_id and r.teacher_id = auth.uid()
));

create policy "teachers can view their student attempts"
on public.mission_attempts for select to authenticated
using (exists (
  select 1 from public.student_assignments sa
  join public.assignments a on a.id = sa.assignment_id
  join public.rooms r on r.id = a.room_id
  where sa.id = student_assignment_id and r.teacher_id = auth.uid()
));

create policy "teachers can view appeals for their rooms"
on public.appeals for select to authenticated
using (exists (
  select 1 from public.mission_attempts ma
  join public.student_assignments sa on sa.id = ma.student_assignment_id
  join public.assignments a on a.id = sa.assignment_id
  join public.rooms r on r.id = a.room_id
  where ma.id = mission_attempt_id and r.teacher_id = auth.uid()
));

create policy "teachers can resolve appeals for their rooms"
on public.appeals for update to authenticated
using (exists (
  select 1 from public.mission_attempts ma
  join public.student_assignments sa on sa.id = ma.student_assignment_id
  join public.assignments a on a.id = sa.assignment_id
  join public.rooms r on r.id = a.room_id
  where ma.id = mission_attempt_id and r.teacher_id = auth.uid()
))
with check (exists (
  select 1 from public.mission_attempts ma
  join public.student_assignments sa on sa.id = ma.student_assignment_id
  join public.assignments a on a.id = sa.assignment_id
  join public.rooms r on r.id = a.room_id
  where ma.id = mission_attempt_id and r.teacher_id = auth.uid()
));

grant select, insert on public.appeals to authenticated;
grant update on public.appeals to authenticated;
grant all on public.appeals to service_role;
grant select on public.student_profiles, public.student_assignments, public.mission_attempts to authenticated;
grant update (stage_results) on public.mission_attempts to authenticated;
