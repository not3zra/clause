"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { RoomStage, roomStageIsCorrect } from "../lib/room-stages";
import type { GradingResult } from "../lib/grading";
import { validateStudentRegistration } from "../lib/students";

type Invite = { assignmentId: string; room: { title: string; theme: string; stageCount: number }; version: { id: string; stages: Array<{ id: string; ordinal: number; title: string; prompt: string; rule: string; token: string; item_type: RoomStage["itemType"]; accepted_answers: string[]; rubric: string; hints: string[]; items: Array<{ prompt: string; accepted_answers: string[] }> }> } };
type Attempt = { id: string; current_stage: number; recovered_tokens: string[]; completed_at: string | null; hints_used: number; stage_results: Record<string, unknown> };

export function StudentInvite({ inviteToken }: { inviteToken: string }) {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [form, setForm] = useState({ fullName: "", rollNumber: "", username: "", password: "" });
  const [message, setMessage] = useState("Loading invite...");

  const loadAttempt = useCallback(async (assignmentId: string) => {
    const { data: enrolment } = await supabase.from("student_assignments").select("id").eq("assignment_id", assignmentId).maybeSingle();
    if (!enrolment) return;
    const { data, error } = await supabase.from("mission_attempts").select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results").eq("student_assignment_id", enrolment.id).single();
    if (error) setMessage(error.message); else { setAttempt(data as Attempt); setMessage(""); }
  }, [supabase]);

  useEffect(() => { void (async () => { const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`); const payload = await response.json(); if (!response.ok) { setMessage(payload.error); return; } setInvite(payload); setMessage(""); const { data: { user } } = await supabase.auth.getUser(); if (user) await loadAttempt(payload.assignmentId); })(); }, [inviteToken, supabase, loadAttempt]);

  const register = async (event: FormEvent) => {
    event.preventDefault(); const valid = validateStudentRegistration(form);
    if (!valid.ok) { setMessage(Object.values(valid.errors).join(" ")); return; }
    setMessage("Creating your mission...");
    const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid.value) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? Object.values(payload.errors ?? {}).join(" ")); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: payload.authEmail, password: valid.value.password });
    if (error) { setMessage(error.message); return; }
    await loadAttempt(payload.assignmentId); setMessage("Your mission is ready. Start when you are ready.");
  };

  if (message && !invite) return <main className="mx-auto max-w-xl px-5 py-16"><div className="panel" role="status">{message}</div></main>;
  if (!invite) return null;
  if (attempt) return <AssignedMission attempt={attempt} invite={invite} onAttempt={setAttempt} onMessage={setMessage} supabase={supabase} />;
  return <main className="mx-auto max-w-xl px-5 py-12"><div className="panel"><p className="eyebrow">Room invite</p><h1 className="mt-2 text-3xl font-black">{invite.room.title}</h1><p className="mt-2 text-[#59677a]">Register to join this {invite.room.stageCount}-stage {invite.room.theme} mission. We do not collect your email address.</p><form className="mt-6 space-y-4" onSubmit={register}><label className="block text-sm font-bold">Full name<input className="input-shell mt-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="block text-sm font-bold">Roll number<input className="input-shell mt-2" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></label><label className="block text-sm font-bold">Username<input className="input-shell mt-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label><label className="block text-sm font-bold">Password<input className="input-shell mt-2" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><button className="primary-action w-full" type="submit">Join mission</button></form>{message && <p className="mt-4 text-sm text-[#315b85]" role="status">{message}</p>}</div></main>;
}

function AssignedMission({ attempt, invite, onAttempt, onMessage, supabase }: { attempt: Attempt; invite: Invite; onAttempt: (attempt: Attempt) => void; onMessage: (message: string) => void; supabase: ReturnType<typeof createBrowserClient> }) {
  const stages: RoomStage[] = invite.version.stages.sort((a, b) => a.ordinal - b.ordinal).map((item) => ({ id: item.id, ordinal: item.ordinal, title: item.title, prompt: item.prompt, rule: item.rule, token: item.token, itemType: item.item_type, acceptedAnswers: item.accepted_answers, rubric: item.rubric, hints: item.hints, items: item.items?.map((child) => ({ prompt: child.prompt, acceptedAnswers: child.accepted_answers })) }));
  const [answer, setAnswer] = useState(stages[0]?.prompt ?? "");
  const [sorts, setSorts] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<"idle" | "correct" | "revise">("idle");
  const [explanation, setExplanation] = useState("");
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealStatus, setAppealStatus] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<GradingResult | null>(null);
  const stage = stages[Math.min(attempt.current_stage, stages.length - 1)]!;
  const stageKey = stage.id ?? `stage-${stage.ordinal}`;
  const solved = attempt.current_stage >= stages.length || Boolean(attempt.completed_at);
  const stageResult = attempt.stage_results[stageKey] as { attempts?: number } | undefined;
  const attemptsUsed = stageResult?.attempts ?? 0;

  useEffect(() => {
    void (async () => {
      const result = await supabase.from("appeals").select("status").eq("mission_attempt_id", attempt.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      const latestAppeal = result.data as { status: string } | null;
      setAppealStatus(latestAppeal?.status ?? null);
    })();
  }, [attempt.id, supabase]);

  const submit = async () => {
    if (solved) return;
    const submitted = stage.itemType === "deterministic" ? sorts : answer;
    let correct = roomStageIsCorrect(stage, submitted);
    if (stage.itemType !== "deterministic") {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/grading", { method: "POST", headers: { "Content-Type": "application/json", ...(session.session ? { Authorization: `Bearer ${session.session.access_token}` } : {}) }, body: JSON.stringify({ original: stage.prompt, submitted, targetRule: stage.rule, rubric: stage.rubric, grade: 7, subtopic: "grammar" }) });
      const graded = await response.json() as GradingResult | { error: string };
      if (response.ok && "verdict" in graded) { setAiFeedback(graded); correct = graded.verdict === "correct" || graded.verdict === "correct_with_improvement" || graded.verdict === "provisional"; }
    }
    if (!correct) { const nextAttempts = attemptsUsed + 1; const stageResults = { ...attempt.stage_results, [stageKey]: { attempts: nextAttempts, correct: false } }; setVerdict("revise"); setRevealed(nextAttempts >= 3); onMessage(nextAttempts >= 3 ? "The answer key is now available with the rule explanation." : `Almost. You have ${3 - nextAttempts} attempt${nextAttempts === 2 ? "" : "s"} left.`); await supabase.from("mission_attempts").update({ hints_used: attempt.hints_used + 1, stage_results: stageResults }).eq("id", attempt.id); onAttempt({ ...attempt, hints_used: attempt.hints_used + 1, stage_results: stageResults }); return; }
    const token = stage.token; const recovered = [...attempt.recovered_tokens, token]; const complete = recovered.length === stages.length;
    // Store a small audit-friendly result per stage until semantic grading replaces this fallback.
    const stageResults = { ...attempt.stage_results, [stageKey]: { correct: true, submittedAt: new Date().toISOString(), verdict: aiFeedback?.verdict ?? "deterministic" } };
    const { data, error } = await supabase.from("mission_attempts").update({ started_at: new Date().toISOString(), current_stage: recovered.length, recovered_tokens: recovered, stage_results: stageResults, completed_at: complete ? new Date().toISOString() : null }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results").single();
    if (error) { onMessage(error.message); return; }
    setVerdict("correct"); onAttempt(data as Attempt); onMessage(complete ? "Case closed. Your result was saved." : "Stage saved. Continue when you are ready.");
  };

  const submitAppeal = async () => {
    const { error } = await supabase.from("appeals").insert({ mission_attempt_id: attempt.id, stage_id: stageKey, student_explanation: explanation });
    if (!error) setAppealStatus("pending");
    onMessage(error ? error.message : "Challenge submitted. You can continue playing while your teacher reviews it."); setAppealOpen(false);
  };

  const continueWithGuidance = async () => {
    const recovered = [...attempt.recovered_tokens, stage.token]; const complete = recovered.length === stages.length;
    const stageResults = { ...attempt.stage_results, [stageKey]: { attempts: attemptsUsed, correct: false, guided: true } };
    const { data, error } = await supabase.from("mission_attempts").update({ current_stage: recovered.length, recovered_tokens: recovered, stage_results: stageResults, completed_at: complete ? new Date().toISOString() : null }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results").single();
    if (error) onMessage(error.message); else { onAttempt(data as Attempt); setAppealOpen(false); setRevealed(false); setVerdict("idle"); onMessage("Guided answer saved. Opening the next piece of evidence."); }
  };

  if (solved) return <main className="mx-auto max-w-xl px-5 py-12"><div className="panel text-center"><p className="eyebrow">Mission complete</p><h1 className="mt-2 text-3xl font-black">Case closed.</h1><p className="mt-3 text-[#59677a]">Your progress and results have been saved for your teacher.</p><div className="mt-6 flex justify-center gap-2">{stages.map((item) => <span className="token token-ready" key={item.id}>{item.token}</span>)}</div></div></main>;
  return <main className="mx-auto max-w-3xl px-5 py-10"><div className="mb-5 flex items-start justify-between gap-4"><div><p className="eyebrow">Your mission</p><h1 className="mt-2 text-3xl font-black">{invite.room.title}</h1><p className="mt-2 text-[#59677a]">{invite.room.theme} | Stage {attempt.current_stage + 1} of {stages.length}</p></div><div className="flex flex-wrap justify-end gap-2">{stages.map((item, index) => <span className={`token ${index < attempt.current_stage ? "token-ready" : ""}`} key={item.id}>{index < attempt.current_stage ? item.token : "Locked"}</span>)}</div></div><div className="panel"><p className="eyebrow">{stage.title}</p><h2 className="mt-2 text-2xl font-black">{stage.prompt}</h2>
    {stage.itemType === "free_text" && <><input className="input-shell mt-6" onChange={(event) => setAnswer(event.target.value)} value={answer} /><button className="ghost-action mt-2" onClick={() => setAnswer(stage.prompt)} type="button">Reset to original</button></>}
    {stage.itemType === "deterministic" && <div className="mt-6 grid gap-3">{stage.items?.map((item) => <div className="rounded-md border border-[#d8dee8] p-4" key={item.prompt}><p className="font-semibold">{item.prompt}</p><div className="mt-3 flex gap-2">{["Agrees", "Needs revision"].map((value) => <button className={`choice ${sorts[item.prompt] === value ? "active" : ""}`} key={value} onClick={() => setSorts({ ...sorts, [item.prompt]: value })} type="button">{value}</button>)}</div></div>)}</div>}
    <div className="mt-6 flex flex-wrap gap-3"><button className="primary-action" disabled={revealed} onClick={submit} type="button">Check answer</button>{!revealed && <button className="ghost-action" onClick={() => setAppealOpen(!appealOpen)} type="button">Challenge this result</button>}</div>
    {verdict !== "idle" && <div className={`feedback feedback-${verdict === "correct" ? "correct" : "revise"}`}><p className="text-sm"><strong>Checking:</strong> {aiFeedback?.ruleCheck ?? stage.rule}</p><p className="mt-3 font-black">{verdict === "correct" ? aiFeedback?.feedback ?? "Correct: clue token recovered." : revealed ? "Answer revealed after three attempts." : aiFeedback?.feedback ?? "Needs revision: identify the subject before changing the verb."}</p>{aiFeedback && !revealed && <p className="mt-3 text-sm">Hint: {aiFeedback.hint}{aiFeedback.provisionalCredit ? " Provisional credit is recorded for teacher review." : ""}</p>}{revealed && <div className="mt-4 rounded-md bg-white/70 p-3 text-sm leading-6"><strong>Accepted answer: </strong>{stage.acceptedAnswers.join(" or ")}<br /><strong>Why: </strong>{stage.rubric}<button className="secondary-action mt-3" onClick={continueWithGuidance} type="button">Continue with guidance</button></div>}</div>}
    {appealStatus && <p className="mt-4 text-sm font-bold text-[#71560d]">Appeal status: {appealStatus === "pending" ? "Awaiting review" : appealStatus}</p>}
    {!revealed && appealOpen && <div className="mt-5 border-t border-[#d8dee8] pt-5"><label className="block text-sm font-bold">Optional explanation<textarea className="input-shell mt-2 min-h-24" onChange={(event) => setExplanation(event.target.value)} value={explanation} /></label><button className="secondary-action mt-3" onClick={submitAppeal} type="button">Submit challenge</button></div>}
  </div></main>;
}
