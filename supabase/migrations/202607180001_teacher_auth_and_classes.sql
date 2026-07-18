create table public.teacher_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  grade smallint not null check (grade between 6 and 9),
  created_at timestamptz not null default now()
);

alter table public.teacher_profiles enable row level security;
alter table public.classes enable row level security;

create policy "teachers can view their profile"
on public.teacher_profiles for select to authenticated
using (id = auth.uid());

create policy "teachers can update their profile"
on public.teacher_profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "teachers can view their classes"
on public.classes for select to authenticated
using (teacher_id = auth.uid());

create policy "teachers can create their classes"
on public.classes for insert to authenticated
with check (teacher_id = auth.uid());

create policy "teachers can update their classes"
on public.classes for update to authenticated
using (teacher_id = auth.uid())
with check (teacher_id = auth.uid());

create or replace function public.handle_new_teacher()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.teacher_profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_teacher();
