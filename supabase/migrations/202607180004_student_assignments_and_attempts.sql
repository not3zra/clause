create table public.student_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  roll_number text not null check (char_length(trim(roll_number)) between 1 and 60),
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  created_at timestamptz not null default now()
);

create table public.student_assignments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.student_profiles (id) on delete cascade,
  assignment_id uuid not null references public.assignments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (student_id, assignment_id)
);

create table public.mission_attempts (
  id uuid primary key default gen_random_uuid(),
  student_assignment_id uuid not null unique references public.student_assignments (id) on delete cascade,
  started_at timestamptz,
  completed_at timestamptz,
  current_stage smallint not null default 0 check (current_stage between 0 and 3),
  recovered_tokens jsonb not null default '[]'::jsonb,
  hints_used smallint not null default 0 check (hints_used >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index student_assignments_assignment_id_idx on public.student_assignments (assignment_id);

create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'teacher') = 'teacher' then
    insert into public.teacher_profiles (id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  end if;
  return new;
end;
$$;

alter table public.student_profiles enable row level security;
alter table public.student_assignments enable row level security;
alter table public.mission_attempts enable row level security;

create policy "students can view their profile" on public.student_profiles for select to authenticated using (id = auth.uid());
create policy "students can view their assignments" on public.student_assignments for select to authenticated using (student_id = auth.uid());
create policy "students can view their attempts" on public.mission_attempts for select to authenticated using (exists (select 1 from public.student_assignments where id = student_assignment_id and student_id = auth.uid()));
create policy "students can update their attempts" on public.mission_attempts for update to authenticated using (exists (select 1 from public.student_assignments where id = student_assignment_id and student_id = auth.uid())) with check (exists (select 1 from public.student_assignments where id = student_assignment_id and student_id = auth.uid()));

grant select on public.student_profiles, public.student_assignments, public.mission_attempts to authenticated;
grant update on public.mission_attempts to authenticated;
grant all on public.student_profiles, public.student_assignments, public.mission_attempts to service_role;
