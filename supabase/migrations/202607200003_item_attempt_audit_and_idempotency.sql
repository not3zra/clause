-- Item attempts are immutable evidence. The mutable mission_attempts row is only a
-- denormalized progress cursor, maintained by the functions below.
create table public.mission_item_attempts (
  id uuid primary key default gen_random_uuid(),
  mission_attempt_id uuid not null references public.mission_attempts (id) on delete cascade,
  room_stage_id uuid not null references public.room_stages (id) on delete restrict,
  item_snapshot jsonb not null,
  student_answer jsonb not null,
  verdict text not null check (verdict in ('correct', 'correct_with_improvement', 'revise', 'provisional', 'guided')),
  recommendation jsonb not null default '{}'::jsonb,
  source text not null check (source in ('ai', 'fallback', 'teacher', 'deterministic')),
  provisional_credit boolean not null default false,
  credit_awarded boolean not null default false,
  hint_used boolean not null default false,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 240),
  submitted_at timestamptz not null default now(),
  unique (mission_attempt_id, idempotency_key)
);

create index mission_item_attempts_attempt_stage_idx on public.mission_item_attempts (mission_attempt_id, room_stage_id, submitted_at);

create table public.mission_metrics_events (
  id uuid primary key default gen_random_uuid(),
  mission_attempt_id uuid not null references public.mission_attempts (id) on delete cascade,
  event_type text not null check (event_type in ('started', 'submitted', 'completed', 'appeal_submitted', 'appeal_resolved')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index mission_metrics_events_attempt_idx on public.mission_metrics_events (mission_attempt_id, created_at);
alter table public.mission_attempts add column score smallint not null default 0 check (score between 0 and 100);
alter table public.mission_attempts add column provisional_score smallint not null default 0 check (provisional_score between 0 and 100);
alter table public.mission_attempts add column elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0);
alter table public.appeals add column item_attempt_id uuid references public.mission_item_attempts (id) on delete restrict;

alter table public.mission_item_attempts enable row level security;
alter table public.mission_metrics_events enable row level security;

create policy "students can view their item attempts" on public.mission_item_attempts for select to authenticated using (exists (
  select 1 from public.mission_attempts ma join public.student_assignments sa on sa.id = ma.student_assignment_id
  where ma.id = mission_attempt_id and sa.student_id = auth.uid()
));
create policy "teachers can view item attempts for their rooms" on public.mission_item_attempts for select to authenticated using (exists (
  select 1 from public.mission_attempts ma join public.student_assignments sa on sa.id = ma.student_assignment_id join public.assignments a on a.id = sa.assignment_id join public.rooms r on r.id = a.room_id
  where ma.id = mission_attempt_id and r.teacher_id = auth.uid()
));
create policy "students can view their metrics events" on public.mission_metrics_events for select to authenticated using (exists (
  select 1 from public.mission_attempts ma join public.student_assignments sa on sa.id = ma.student_assignment_id
  where ma.id = mission_attempt_id and sa.student_id = auth.uid()
));
create policy "teachers can view metrics for their rooms" on public.mission_metrics_events for select to authenticated using (exists (
  select 1 from public.mission_attempts ma join public.student_assignments sa on sa.id = ma.student_assignment_id join public.assignments a on a.id = sa.assignment_id join public.rooms r on r.id = a.room_id
  where ma.id = mission_attempt_id and r.teacher_id = auth.uid()
));

create or replace function public.submit_mission_item(
  p_attempt_id uuid, p_stage_id uuid, p_answer jsonb, p_verdict text,
  p_recommendation jsonb, p_source text, p_provisional_credit boolean,
  p_credit_awarded boolean, p_hint_used boolean, p_idempotency_key text
) returns public.mission_item_attempts
language plpgsql security definer set search_path = public as $$
declare v_attempt public.mission_attempts%rowtype; v_stage public.room_stages%rowtype; v_existing public.mission_item_attempts%rowtype;
declare v_credited integer; v_provisional integer; v_score integer; v_stage_count integer; v_tokens jsonb;
begin
  select * into v_attempt from public.mission_attempts where id = p_attempt_id for update;
  if v_attempt.id is null or not exists (select 1 from public.student_assignments where id = v_attempt.student_assignment_id and student_id = auth.uid()) then raise exception 'Mission attempt not found'; end if;
  select * into v_existing from public.mission_item_attempts where mission_attempt_id = p_attempt_id and idempotency_key = p_idempotency_key;
  if v_existing.id is not null then return v_existing; end if;
  select * into v_stage from public.room_stages where id = p_stage_id and room_version_id = v_attempt.room_version_id;
  if v_stage.id is null or v_stage.ordinal <> v_attempt.current_stage + 1 or v_attempt.completed_at is not null then raise exception 'This stage is no longer active'; end if;
  insert into public.mission_item_attempts (mission_attempt_id, room_stage_id, item_snapshot, student_answer, verdict, recommendation, source, provisional_credit, credit_awarded, hint_used, idempotency_key)
  values (p_attempt_id, p_stage_id, jsonb_build_object('id', v_stage.id, 'title', v_stage.title, 'prompt', v_stage.prompt, 'rule', v_stage.rule, 'rubric', v_stage.rubric, 'accepted_answers', v_stage.accepted_answers), p_answer, p_verdict, coalesce(p_recommendation, '{}'::jsonb), p_source, p_provisional_credit, p_credit_awarded, p_hint_used, p_idempotency_key)
  returning * into v_existing;
  select count(distinct room_stage_id) filter (where credit_awarded), count(distinct room_stage_id) filter (where provisional_credit)
  into v_credited, v_provisional from public.mission_item_attempts where mission_attempt_id = p_attempt_id;
  select stage_count into v_stage_count from public.room_versions where id = v_attempt.room_version_id;
  v_score := round((least(v_stage_count, v_credited + v_provisional)::numeric / v_stage_count) * 100);
  if p_credit_awarded then v_tokens := v_attempt.recovered_tokens || jsonb_build_array(v_stage.token); else v_tokens := v_attempt.recovered_tokens; end if;
  update public.mission_attempts set started_at = coalesce(started_at, now()), current_stage = case when p_credit_awarded then v_attempt.current_stage + 1 else v_attempt.current_stage end, recovered_tokens = v_tokens, hints_used = hints_used + case when p_hint_used then 1 else 0 end, score = v_score, provisional_score = round((least(v_stage_count, v_provisional)::numeric / v_stage_count) * 100), stage_results = stage_results || jsonb_build_object(v_stage.id::text, jsonb_build_object('latest_item_attempt_id', v_existing.id, 'verdict', p_verdict, 'provisional_credit', p_provisional_credit, 'credit_awarded', p_credit_awarded)), completed_at = case when p_credit_awarded and v_attempt.current_stage + 1 = v_stage_count then now() else completed_at end, elapsed_seconds = case when p_credit_awarded and v_attempt.current_stage + 1 = v_stage_count then extract(epoch from now() - coalesce(started_at, now()))::integer else elapsed_seconds end, updated_at = now() where id = p_attempt_id;
  insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (p_attempt_id, case when v_attempt.started_at is null then 'started' else 'submitted' end, jsonb_build_object('item_attempt_id', v_existing.id, 'stage_id', v_stage.id, 'score', v_score));
  if p_credit_awarded and v_attempt.current_stage + 1 = v_stage_count then insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (p_attempt_id, 'completed', jsonb_build_object('score', v_score)); end if;
  return v_existing;
end; $$;

create or replace function public.resolve_appeal(p_appeal_id uuid, p_decision text, p_teacher_comment text)
returns public.appeals language plpgsql security definer set search_path = public as $$
declare v_appeal public.appeals%rowtype;
begin
  select ap.* into v_appeal from public.appeals ap join public.mission_attempts ma on ma.id = ap.mission_attempt_id join public.student_assignments sa on sa.id = ma.student_assignment_id join public.assignments a on a.id = sa.assignment_id join public.rooms r on r.id = a.room_id where ap.id = p_appeal_id and r.teacher_id = auth.uid() for update;
  if v_appeal.id is null then raise exception 'Appeal not found'; end if;
  if v_appeal.status <> 'pending' then raise exception 'Appeal has already been resolved'; end if;
  if p_decision not in ('accepted', 'denied', 'overridden') then raise exception 'Invalid appeal decision'; end if;
  insert into public.appeal_decisions (appeal_id, teacher_id, decision, teacher_comment) values (v_appeal.id, auth.uid(), p_decision, left(coalesce(p_teacher_comment, ''), 1000));
  update public.appeals set status = p_decision, teacher_comment = left(coalesce(p_teacher_comment, ''), 1000), reviewed_at = now() where id = v_appeal.id returning * into v_appeal;
  insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (v_appeal.mission_attempt_id, 'appeal_resolved', jsonb_build_object('appeal_id', v_appeal.id, 'decision', p_decision));
  return v_appeal;
end; $$;

revoke insert, update, delete on public.mission_item_attempts, public.mission_metrics_events from authenticated;
revoke update on public.appeals from authenticated;
grant select on public.mission_item_attempts, public.mission_metrics_events to authenticated;
grant execute on function public.submit_mission_item(uuid, uuid, jsonb, text, jsonb, text, boolean, boolean, boolean, text) to authenticated;
grant execute on function public.resolve_appeal(uuid, text, text) to authenticated;
grant all on public.mission_item_attempts, public.mission_metrics_events to service_role;
