-- Completing the last grammar stage only unlocks the final clue board.  A
-- separate, server-validated solve records the completed result and preserves
-- the existing immutable item-attempt audit trail.
alter table public.rooms add column story text not null default '' check (char_length(story) <= 1200);

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
  select count(distinct room_stage_id) filter (where credit_awarded), count(distinct room_stage_id) filter (where provisional_credit) into v_credited, v_provisional from public.mission_item_attempts where mission_attempt_id = p_attempt_id;
  select stage_count into v_stage_count from public.room_versions where id = v_attempt.room_version_id;
  v_score := round((least(v_stage_count, v_credited + v_provisional)::numeric / v_stage_count) * 100);
  if p_credit_awarded then v_tokens := v_attempt.recovered_tokens || jsonb_build_array(v_stage.token); else v_tokens := v_attempt.recovered_tokens; end if;
  update public.mission_attempts set started_at = coalesce(started_at, now()), current_stage = case when p_credit_awarded then v_attempt.current_stage + 1 else v_attempt.current_stage end, recovered_tokens = v_tokens, hints_used = hints_used + case when p_hint_used then 1 else 0 end, score = v_score, provisional_score = round((least(v_stage_count, v_provisional)::numeric / v_stage_count) * 100), stage_results = stage_results || jsonb_build_object(v_stage.id::text, jsonb_build_object('latest_item_attempt_id', v_existing.id, 'verdict', p_verdict, 'provisional_credit', p_provisional_credit, 'credit_awarded', p_credit_awarded)), updated_at = now() where id = p_attempt_id;
  insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (p_attempt_id, case when v_attempt.started_at is null then 'started' else 'submitted' end, jsonb_build_object('item_attempt_id', v_existing.id, 'stage_id', v_stage.id, 'score', v_score));
  return v_existing;
end; $$;

create or replace function public.solve_mission_final_clue(p_attempt_id uuid, p_selected_tokens jsonb)
returns public.mission_attempts language plpgsql security definer set search_path = public as $$
declare v_attempt public.mission_attempts%rowtype; v_expected jsonb; v_stage_count integer;
begin
  select * into v_attempt from public.mission_attempts where id = p_attempt_id for update;
  if v_attempt.id is null or not exists (select 1 from public.student_assignments where id = v_attempt.student_assignment_id and student_id = auth.uid()) then raise exception 'Mission attempt not found'; end if;
  select stage_count into v_stage_count from public.room_versions where id = v_attempt.room_version_id;
  if v_attempt.completed_at is not null then return v_attempt; end if;
  if v_attempt.current_stage <> v_stage_count then raise exception 'Collect every clue before solving the final mystery'; end if;
  select coalesce(jsonb_agg(token order by ordinal), '[]'::jsonb) into v_expected from public.room_stages where room_version_id = v_attempt.room_version_id;
  if jsonb_typeof(p_selected_tokens) <> 'array' or p_selected_tokens <> v_expected then
    insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (p_attempt_id, 'submitted', jsonb_build_object('kind', 'final_clue_attempt', 'success', false));
    raise exception 'The clues are not in the right sequence';
  end if;
  update public.mission_attempts set completed_at = now(), elapsed_seconds = extract(epoch from now() - coalesce(started_at, now()))::integer, updated_at = now() where id = p_attempt_id returning * into v_attempt;
  insert into public.mission_metrics_events (mission_attempt_id, event_type, payload) values (p_attempt_id, 'completed', jsonb_build_object('kind', 'final_clue_attempt', 'success', true, 'score', v_attempt.score));
  return v_attempt;
end; $$;

create or replace function public.solve_session_mission_final_clue(p_session_hash text, p_attempt_id uuid, p_selected_tokens jsonb)
returns public.mission_attempts language plpgsql security definer set search_path = public as $$
declare v_student_id uuid;
begin
  select sa.student_id into v_student_id from public.student_sessions ss join public.student_assignments sa on sa.id = ss.student_assignment_id where ss.token_hash = p_session_hash and ss.revoked_at is null and ss.expires_at > now() and sa.id = (select student_assignment_id from public.mission_attempts where id = p_attempt_id);
  if v_student_id is null then raise exception 'Student session not found'; end if;
  perform set_config('request.jwt.claim.sub', v_student_id::text, true);
  return public.solve_mission_final_clue(p_attempt_id, p_selected_tokens);
end; $$;

grant execute on function public.solve_mission_final_clue(uuid, jsonb) to authenticated;
grant execute on function public.solve_session_mission_final_clue(text, uuid, jsonb) to service_role;
