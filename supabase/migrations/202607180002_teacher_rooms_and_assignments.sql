create type public.room_status as enum ('draft', 'published', 'closed');

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  topic text not null check (char_length(trim(topic)) between 1 and 100),
  subtopic text not null check (char_length(trim(subtopic)) between 1 and 100),
  theme text not null check (theme in ('Detective Office', 'Cursed Castle', 'Sci-Fi Lab')),
  stage_count smallint not null check (stage_count in (3, 4)),
  status public.room_status not null default 'draft',
  reviewed_at timestamptz,
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_rooms_are_reviewed_and_validated check (
    status <> 'published' or (reviewed_at is not null and validated_at is not null)
  )
);

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms (id) on delete cascade,
  teacher_id uuid not null references public.teacher_profiles (id) on delete cascade,
  invite_token uuid not null unique default gen_random_uuid(),
  marks_visible boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index rooms_teacher_id_created_at_idx on public.rooms (teacher_id, created_at desc);
create index assignments_invite_token_idx on public.assignments (invite_token);

alter table public.rooms enable row level security;
alter table public.assignments enable row level security;

create policy "teachers can manage their rooms"
on public.rooms for all to authenticated
using (teacher_id = auth.uid())
with check (
  teacher_id = auth.uid()
  and exists (select 1 from public.classes where id = class_id and teacher_id = auth.uid())
);

create policy "teachers can manage their assignments"
on public.assignments for all to authenticated
using (
  teacher_id = auth.uid()
  and exists (select 1 from public.rooms where id = room_id and teacher_id = auth.uid())
)
with check (
  teacher_id = auth.uid()
  and exists (select 1 from public.rooms where id = room_id and teacher_id = auth.uid())
);
