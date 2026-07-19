create table public.appeal_decisions (
  id uuid primary key default gen_random_uuid(),
  appeal_id uuid not null references public.appeals (id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  decision text not null check (decision in ('accepted', 'denied', 'overridden')),
  teacher_comment text not null default '' check (char_length(teacher_comment) <= 1000),
  created_at timestamptz not null default now()
);

create index appeal_decisions_appeal_id_idx on public.appeal_decisions (appeal_id, created_at desc);
alter table public.appeal_decisions enable row level security;

create policy "teachers can view their appeal audit"
on public.appeal_decisions for select to authenticated
using (teacher_id = auth.uid());

create policy "teachers can add their appeal audit"
on public.appeal_decisions for insert to authenticated
with check (teacher_id = auth.uid() and exists (
  select 1 from public.appeals ap join public.mission_attempts ma on ma.id = ap.mission_attempt_id join public.student_assignments sa on sa.id = ma.student_assignment_id join public.assignments a on a.id = sa.assignment_id join public.rooms r on r.id = a.room_id
  where ap.id = appeal_id and r.teacher_id = auth.uid()
));

grant select, insert on public.appeal_decisions to authenticated;
grant all on public.appeal_decisions to service_role;
