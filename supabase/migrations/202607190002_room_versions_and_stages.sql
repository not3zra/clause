create type public.room_stage_item_type as enum ('deterministic', 'free_text');

create table public.room_versions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  version_number smallint not null default 1 check (version_number > 0),
  stage_count smallint not null check (stage_count in (3, 4)),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (room_id, version_number)
);

create table public.room_stages (
  id uuid primary key default gen_random_uuid(),
  room_version_id uuid not null references public.room_versions (id) on delete cascade,
  ordinal smallint not null check (ordinal between 1 and 4),
  title text not null check (char_length(trim(title)) between 1 and 160),
  prompt text not null check (char_length(trim(prompt)) between 1 and 2000),
  rule text not null check (char_length(trim(rule)) between 1 and 2000),
  token text not null check (char_length(trim(token)) between 1 and 60),
  item_type public.room_stage_item_type not null,
  accepted_answers jsonb not null check (jsonb_typeof(accepted_answers) = 'array' and jsonb_array_length(accepted_answers) > 0),
  rubric text not null check (char_length(trim(rubric)) between 1 and 2000),
  hints jsonb not null check (jsonb_typeof(hints) = 'array' and jsonb_array_length(hints) > 0),
  unique (room_version_id, ordinal),
  unique (room_version_id, token)
);

create table public.room_stage_items (
  id uuid primary key default gen_random_uuid(),
  room_stage_id uuid not null references public.room_stages (id) on delete cascade,
  ordinal smallint not null check (ordinal > 0),
  prompt text not null check (char_length(trim(prompt)) between 1 and 2000),
  accepted_answers jsonb not null check (jsonb_typeof(accepted_answers) = 'array' and jsonb_array_length(accepted_answers) > 0),
  unique (room_stage_id, ordinal)
);

alter table public.assignments add column published_room_version_id uuid references public.room_versions (id) on delete restrict;
alter table public.mission_attempts add column room_version_id uuid references public.room_versions (id) on delete restrict;
alter table public.mission_attempts drop constraint mission_attempts_current_stage_check;
alter table public.mission_attempts add constraint mission_attempts_current_stage_check check (current_stage between 0 and 4);
alter table public.appeals drop constraint appeals_stage_id_check;

-- Backfill every existing demo room to a self-contained version. Existing published
-- assignments are pointed at that frozen snapshot, so changing future drafts cannot
-- alter a link that was already shared.
insert into public.room_versions (room_id, stage_count, published_at)
select r.id, r.stage_count, case when r.status = 'published' then now() else null end
from public.rooms r
where not exists (select 1 from public.room_versions rv where rv.room_id = r.id);

insert into public.room_stages (room_version_id, ordinal, title, prompt, rule, token, item_type, accepted_answers, rubric, hints)
select rv.id, seed.ordinal, seed.title, seed.prompt, seed.rule, seed.token, seed.item_type::public.room_stage_item_type, seed.accepted_answers::jsonb, seed.rubric, seed.hints::jsonb
from public.room_versions rv
join public.rooms r on r.id = rv.room_id
cross join (values
  (1, 'Sentence Surgery', 'The team are reviewing the witness notes before lunch.', 'Does the verb agree with the singular collective noun team?', 'CASE', 'free_text', '["The team is reviewing"]', 'Team is singular here, so it takes is.', '["Find the subject before changing the verb."]'),
  (2, 'Evidence Sort', 'Sort each sentence by whether the subject and verb agree.', 'Find the real subject before deciding whether its verb agrees.', 'FILE', 'deterministic', '["All evidence sorted"]', 'Check the true subject in every sentence.', '["Ignore phrases between the subject and verb."]'),
  (3, 'Case File Rewrite', 'Repair both statements in the case file.', 'Check each linked sentence for the subject that controls its verb.', 'OPEN', 'free_text', '["notebook was", "clues were"]', 'Neither/nor uses was here; clues takes were.', '["Check each sentence separately."]'),
  (4, 'Final Statement', 'Write one sentence using a singular subject and matching verb.', 'A singular subject needs a singular verb.', 'SEAL', 'free_text', '["is", "was", "has"]', 'The subject and verb must agree.', '["Start with one person, place, or thing."]')
) as seed(ordinal, title, prompt, rule, token, item_type, accepted_answers, rubric, hints)
where seed.ordinal <= rv.stage_count;

insert into public.room_stage_items (room_stage_id, ordinal, prompt, accepted_answers)
select s.id, seed.ordinal, seed.prompt, seed.accepted_answers::jsonb
from public.room_stages s join public.room_versions rv on rv.id = s.room_version_id
cross join (values
 (1, 'The clues are inside the blue folder.', '["Agrees"]'), (2, 'A stack of reports are on the desk.', '["Needs revision"]'), (3, 'Each witness has a numbered badge.', '["Agrees"]'), (4, 'The detective and the clerk is checking prints.', '["Needs revision"]')
) as seed(ordinal, prompt, accepted_answers)
where s.ordinal = 2;

update public.assignments a set published_room_version_id = rv.id
from public.room_versions rv where rv.room_id = a.room_id and a.published_room_version_id is null;

update public.mission_attempts ma set room_version_id = a.published_room_version_id
from public.student_assignments sa join public.assignments a on a.id = sa.assignment_id
where sa.id = ma.student_assignment_id and ma.room_version_id is null;

create index room_versions_room_id_idx on public.room_versions (room_id, version_number desc);
create index room_stages_room_version_id_idx on public.room_stages (room_version_id, ordinal);

alter table public.room_versions enable row level security;
alter table public.room_stages enable row level security;
alter table public.room_stage_items enable row level security;

create policy "teachers can manage draft room versions" on public.room_versions for all to authenticated
using (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()) and published_at is null)
with check (exists (select 1 from public.rooms r where r.id = room_id and r.teacher_id = auth.uid()) and published_at is null);
create policy "teachers can manage draft room stages" on public.room_stages for all to authenticated
using (exists (select 1 from public.room_versions rv join public.rooms r on r.id = rv.room_id where rv.id = room_version_id and r.teacher_id = auth.uid() and rv.published_at is null))
with check (exists (select 1 from public.room_versions rv join public.rooms r on r.id = rv.room_id where rv.id = room_version_id and r.teacher_id = auth.uid() and rv.published_at is null));
create policy "teachers can manage draft room stage items" on public.room_stage_items for all to authenticated
using (exists (select 1 from public.room_stages rs join public.room_versions rv on rv.id = rs.room_version_id join public.rooms r on r.id = rv.room_id where rs.id = room_stage_id and r.teacher_id = auth.uid() and rv.published_at is null))
with check (exists (select 1 from public.room_stages rs join public.room_versions rv on rv.id = rs.room_version_id join public.rooms r on r.id = rv.room_id where rs.id = room_stage_id and r.teacher_id = auth.uid() and rv.published_at is null));

create or replace function public.freeze_room_version()
returns trigger language plpgsql as $$
begin
  if old.published_at is not null then raise exception 'Published room versions are immutable'; end if;
  return new;
end; $$;
create or replace function public.freeze_room_stage()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.room_versions where id = coalesce(new.room_version_id, old.room_version_id) and published_at is not null) then raise exception 'Published room versions are immutable'; end if;
  return new;
end; $$;
create or replace function public.freeze_room_stage_item()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.room_stages s join public.room_versions v on v.id = s.room_version_id where s.id = coalesce(new.room_stage_id, old.room_stage_id) and v.published_at is not null) then raise exception 'Published room versions are immutable'; end if;
  return new;
end; $$;
create trigger room_versions_are_immutable before update or delete on public.room_versions for each row execute function public.freeze_room_version();
create trigger room_stages_are_immutable before insert or update or delete on public.room_stages for each row execute function public.freeze_room_stage();
create trigger room_stage_items_are_immutable before insert or update or delete on public.room_stage_items for each row execute function public.freeze_room_stage_item();

create or replace function public.publish_room_version(p_room_id uuid, p_marks_visible boolean)
returns table(invite_token uuid, marks_visible boolean, room_version_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_version public.room_versions%rowtype; v_assignment public.assignments%rowtype;
begin
  if not exists (select 1 from public.rooms where id = p_room_id and teacher_id = auth.uid() and status = 'draft' and reviewed_at is not null and validated_at is not null) then raise exception 'Room is not ready to publish'; end if;
  select * into v_version from public.room_versions where room_id = p_room_id and published_at is null order by version_number desc limit 1 for update;
  if v_version.id is null or (select count(*) from public.room_stages where room_version_id = v_version.id) <> v_version.stage_count then raise exception 'Room version must contain every stage before publishing'; end if;
  update public.room_versions set published_at = now() where id = v_version.id;
  update public.rooms set status = 'published', updated_at = now() where id = p_room_id;
  insert into public.assignments (room_id, teacher_id, marks_visible, published_room_version_id) values (p_room_id, auth.uid(), p_marks_visible, v_version.id) returning * into v_assignment;
  return query select v_assignment.invite_token, v_assignment.marks_visible, v_version.id;
end; $$;
grant select, insert, update, delete on public.room_versions, public.room_stages, public.room_stage_items to authenticated;
grant all on public.room_versions, public.room_stages, public.room_stage_items to service_role;
grant execute on function public.publish_room_version(uuid, boolean) to authenticated;
