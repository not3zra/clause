create table public.room_generation_audits (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  room_id uuid references public.rooms (id) on delete set null,
  provider text not null default 'groq',
  model text not null,
  stage_count smallint not null check (stage_count in (3, 4)),
  outcome text not null check (outcome in ('validated', 'rejected', 'unavailable')),
  validation_errors jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index room_generation_audits_teacher_created_idx on public.room_generation_audits (teacher_id, created_at desc);
alter table public.room_generation_audits enable row level security;
create policy "teachers can view their generation audit" on public.room_generation_audits for select to authenticated using (teacher_id = auth.uid());
grant select on public.room_generation_audits to authenticated;
grant all on public.room_generation_audits to service_role;
