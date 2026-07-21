"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { GradingResult } from "../lib/grading";
import { publishedMissionStages, type PublishedRoomStage } from "../lib/published-mission";
import { roomStageIsCorrect } from "../lib/room-stages";
import { validateStudentRegistration } from "../lib/students";

type Invite = {
  assignmentId: string;
  room: { title: string; story: string; theme: string; stageCount: number };
  version: { id: string; stages: PublishedRoomStage[] };
};
type Attempt = { id: string; current_stage: number; recovered_tokens: string[]; completed_at: string | null; hints_used: number; score?: number; elapsed_seconds?: number; stage_results: Record<string, unknown> };

export function StudentInvite({ inviteToken }: { inviteToken: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [form, setForm] = useState({ fullName: "", rollNumber: "" });
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [message, setMessage] = useState("Loading invite...");
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);

  const loadAttempt = useCallback(async (assignmentId: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setMessage("Sign in to continue your mission."); return false; }
    const response = await fetch(`/api/attempts/${assignmentId}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
    const data = await response.json() as Attempt | { error?: string };
    if (!response.ok) { setMessage("error" in data ? data.error ?? "Could not load your mission." : "Could not load your mission."); return false; }
    setAttempt(data as Attempt);
    return true;
  }, [supabase]);

  useEffect(() => { void (async () => {
    const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`);
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error); return; }
    setInvite(payload);
    setAttempt((payload.attempt as Attempt | null) ?? null);
    setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await loadAttempt(payload.assignmentId);
  })(); }, [inviteToken, loadAttempt, supabase]);

  const register = async (event: FormEvent) => {
    event.preventDefault();
    const valid = validateStudentRegistration(form);
    if (!valid.ok) { setMessage(Object.values(valid.errors).join(" ")); return; }
    setMessage("Creating your mission...");
    const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: valid.value.fullName, rollNumber: valid.value.rollNumber }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? Object.values(payload.errors ?? {}).join(" ")); return; }
    setCredentials({ username: valid.value.username, password: valid.value.password });
    const { error } = await supabase.auth.signInWithPassword({ email: payload.authEmail, password: valid.value.password });
    if (error) { setMessage(error.message); return; }
    if (await loadAttempt(payload.assignmentId)) setMessage("Your mission is ready.");
  };

  if (message && !invite) return <main className="mx-auto max-w-xl px-5 py-16"><div className="card card-lg" role="status">{message}</div></main>;
  if (!invite) return null;
  if (attempt) return <AssignedMission attempt={attempt} invite={invite} onAttempt={setAttempt} onMessage={setMessage} supabase={supabase} />;
  return <main className="mx-auto max-w-xl px-5 py-12"><div className="card card-lg"><p className="eyebrow">Room invite</p><h1 className="mt-2 text-3xl font-black" style={{ fontFamily: "var(--font-display)" }}>{invite.room.title}</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Register to join this {invite.room.stageCount}-stage {invite.room.theme} mission. We do not collect your email address.</p>{!credentials ? <form className="mt-6 space-y-4" onSubmit={register}><label className="label">Full name<input className="input mt-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="label">Roll number<input className="input mt-2" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></label><button className="btn btn-primary w-full" type="submit">Join mission</button></form> : <div className="card-sm mt-6" style={{ background: "var(--success-light)", borderColor: "var(--success)" }}><p style={{ fontWeight: 700, fontSize: 14 }}>Account created</p><p style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>Save these credentials to sign back in later.</p><div style={{ marginTop: 12, fontSize: 13 }}><strong>Username:</strong> {credentials.username}<br /><strong>Password:</strong> {credentials.password}</div></div>}{message && <p style={{ marginTop: 16, fontSize: 14, color: "var(--text-secondary)" }} role="status">{message}</p>}</div></main>;
}

function AssignedMission({ attempt, invite, onAttempt, onMessage, supabase }: { attempt: Attempt; invite: Invite; onAttempt: (attempt: Attempt) => void; onMessage: (message: string) => void; supabase: ReturnType<typeof createBrowserClient> }) {
  const stages = useMemo(() => publishedMissionStages(invite.version.stages), [invite.version.stages]);
  const [phase, setPhase] = useState<"launch" | "stages" | "success">(attempt.completed_at ? "success" : "launch");
  const [answer, setAnswer] = useState("");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [verdict, setVerdict] = useState<"idle" | "correct" | "revise" | "appeal">("idle");
  const [explanation, setExplanation] = useState("");
  const [appealOpen, setAppealOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<GradingResult | null>(null);
  const [seconds, setSeconds] = useState(720);
  const stageIndex = Math.min(attempt.current_stage, Math.max(0, stages.length - 1));
  const stage = stages[stageIndex];
  const stageResult = stage ? attempt.stage_results[stage.id] as { attempts?: number } | undefined : undefined;
  const attemptsUsed = stageResult?.attempts ?? 0;
  const recoveredTokens = attempt.recovered_tokens;
  const themeClass = invite.room.theme.toLowerCase().replace(/\s+/g, "-");
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => { const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000); return () => window.clearInterval(timer); }, []);

  const resetForNextStage = (nextAttempt: Attempt) => {
    if (nextAttempt.current_stage >= stages.length) { setPhase("success"); return; }
    setAnswer("");
    setChoices({});
    setVerdict("idle");
    setRevealed(false);
    setAppealOpen(false);
    setAiFeedback(null);
  };

  const saveStage = async (guided: boolean) => {
    if (!stage) return;
    const recovered = recoveredTokens.includes(stage.token) ? recoveredTokens : [...recoveredTokens, stage.token];
    const complete = recovered.length === stages.length;
    const stageResults = { ...attempt.stage_results, [stage.id]: { attempts: attemptsUsed, correct: !guided, guided, verdict: aiFeedback?.verdict ?? (guided ? "guided" : "answer_key") } };
    const { data, error } = await supabase.from("mission_attempts").update({
      started_at: new Date().toISOString(), current_stage: recovered.length, recovered_tokens: recovered, stage_results: stageResults, completed_at: complete ? new Date().toISOString() : null,
    }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results, score, elapsed_seconds").single();
    if (error) { onMessage(error.message); return; }
    const nextAttempt = data as Attempt;
    onAttempt(nextAttempt);
    resetForNextStage(nextAttempt);
  };

  const markWrong = () => {
    if (!stage) return;
    const nextAttempts = attemptsUsed + 1;
    const stageResults = { ...attempt.stage_results, [stage.id]: { attempts: nextAttempts, correct: false } };
    setVerdict("revise");
    setRevealed(nextAttempts >= 3);
    onMessage(nextAttempts >= 3 ? "The answer key is now available with the rule explanation." : `Almost. You have ${3 - nextAttempts} attempt${nextAttempts === 2 ? "" : "s"} left.`);
    void supabase.from("mission_attempts").update({ hints_used: attempt.hints_used + 1, stage_results: stageResults }).eq("id", attempt.id).then(() => onAttempt({ ...attempt, hints_used: attempt.hints_used + 1, stage_results: stageResults }));
  };

  const submit = async () => {
    if (!stage || attempt.current_stage >= stages.length) return;
    const submitted = stage.itemType === "deterministic" ? choices : answer;
    let correct = roomStageIsCorrect(stage, submitted);
    if (stage.itemType === "free_text") {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/grading", { method: "POST", headers: { "Content-Type": "application/json", ...(session.session ? { Authorization: `Bearer ${session.session.access_token}` } : {}) }, body: JSON.stringify({ original: stage.prompt, submitted: answer, targetRule: stage.rule, rubric: stage.rubric, grade: 7, subtopic: stage.rule }) });
      const graded = await response.json() as GradingResult | { error: string };
      if (response.ok && "verdict" in graded) { setAiFeedback(graded); correct = graded.verdict === "correct" || graded.verdict === "correct_with_improvement" || graded.verdict === "provisional"; }
    }
    if (!correct) { markWrong(); return; }
    setVerdict("correct");
    await saveStage(false);
    onMessage(recoveredTokens.length + 1 >= stages.length ? "Mission complete. Your result was saved." : "Stage saved. Opening the next challenge.");
  };

  const submitAppeal = async () => {
    if (!stage) return;
    const { error } = await supabase.from("appeals").insert({ mission_attempt_id: attempt.id, stage_id: stage.id, student_explanation: explanation });
    onMessage(error ? error.message : "Challenge submitted. You can keep playing while your teacher reviews it.");
    setAppealOpen(false);
    setVerdict("appeal");
  };

  if (!stage) return <main className="mx-auto max-w-xl px-5 py-16"><div className="card card-lg">This published mission has no playable stages.</div></main>;
  if (phase === "launch") return <main className={`room-launch theme-${themeClass}`}><p className="eyebrow">{invite.room.theme} mission</p><h1>{invite.room.title}</h1><p className="launch-desc">{invite.room.story}</p><div className="launch-stages">{stages.map((item) => <div className="launch-stage" key={item.id}><span>{item.ordinal}.</span><span>{item.title}</span></div>)}</div><div className="launch-actions"><button className="btn btn-primary" onClick={() => setPhase("stages")} type="button">Begin mission</button></div></main>;
  if (phase === "success") return <main className={`success theme-${themeClass}`}><div className="card card-lg"><div className="success-icon success-bounce">OK</div><p className="eyebrow" style={{ marginTop: 16 }}>Mission complete</p><h1 style={{ fontSize: 28 }}>{invite.room.title}</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>You completed every published stage.</p><div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>{stages.map((item) => <span className="token earned" key={item.id}>{item.token}</span>)}</div></div></main>;

  return <main className={`mission-player theme-${themeClass}`}><div className="mission-player-header header-shimmer"><div><span className="badge">{invite.room.theme}</span><h1>{invite.room.title}</h1><p>Stage {stageIndex + 1} of {stages.length} · Collect each stage token.</p></div><div className={`mission-timer ${seconds <= 60 ? "timer-urgent" : ""}`}>{time}</div></div><div className="progress-rail">{stages.map((item, index) => { const complete = recoveredTokens.includes(item.token); return <div className={`progress-step ${complete ? "done" : ""}`} key={item.id}><div className={`progress-step-marker ${complete ? "done" : stageIndex === index ? "current" : ""}`}>{complete ? "OK" : index + 1}</div><div className="progress-step-label"><strong>{item.title}</strong><small>{complete ? item.token : stageIndex === index ? "In progress" : "Locked"}</small></div>{index < stages.length - 1 && <div className={`progress-step-connector ${complete ? "done" : ""}`} />}</div>; })}</div><div className="game-layout"><div className="game-main stage-enter" key={stage.id}><p className="eyebrow">Stage {stage.ordinal} of {stages.length}</p><h2>{stage.title}</h2><p className="stage-desc">{stage.prompt}</p>{stage.itemType === "free_text" ? <><input aria-label="Your answer" className="input" onChange={(event) => setAnswer(event.target.value)} style={{ marginTop: 24 }} value={answer} /><button className="btn btn-primary" onClick={submit} style={{ marginTop: 12 }} type="button">Submit answer</button></> : <><div style={{ display: "grid", gap: 12, marginTop: 16 }}>{stage.items?.map((item) => <div className="sort-card" key={item.prompt}><p>{item.prompt}</p><div style={{ display: "flex", gap: 8, marginTop: 12 }}>{["Agrees", "Needs revision"].map((choice) => <button className={`btn btn-sm ${choices[item.prompt] === choice ? "btn-primary" : "btn-secondary"}`} key={choice} onClick={() => setChoices({ ...choices, [item.prompt]: choice })} type="button">{choice}</button>)}</div></div>)}</div><button className="btn btn-primary" disabled={revealed} onClick={submit} style={{ marginTop: 20 }} type="button">Submit answers</button></>}<FeedbackPanelStudent answerRevealed={revealed} appealOpen={appealOpen} attempts={attemptsUsed} onAppealOpen={() => setAppealOpen(true)} onAppealSubmit={submitAppeal} onGuidedContinue={() => void saveStage(true)} rule={stage.rule} acceptedAnswers={stage.acceptedAnswers} rubric={stage.rubric} verdict={verdict} aiFeedback={aiFeedback} /></div><aside style={{ display: "flex", flexDirection: "column", gap: 16 }}><div className="evidence-locker"><p className="eyebrow">Tokens</p><div className="tokens">{stages.map((item) => <span className={`token ${recoveredTokens.includes(item.token) ? "earned" : ""}`} key={item.id}>{recoveredTokens.includes(item.token) ? item.token : "Locked"}</span>)}</div><p className="locker-stats">{recoveredTokens.length} of {stages.length} tokens recovered</p></div></aside></div></main>;
}

function FeedbackPanelStudent({ answerRevealed, appealOpen, attempts, onAppealOpen, onAppealSubmit, onGuidedContinue, rule, acceptedAnswers, rubric, verdict, aiFeedback }: { answerRevealed: boolean; appealOpen: boolean; attempts: number; onAppealOpen: () => void; onAppealSubmit: () => void; onGuidedContinue: () => void; rule: string; acceptedAnswers: string[]; rubric: string; verdict: "idle" | "correct" | "revise" | "appeal"; aiFeedback: GradingResult | null; }) {
  if (verdict === "idle") return null;
  return <div className={`feedback-panel ${verdict === "correct" ? "correct" : verdict === "appeal" ? "appeal" : "revise"}`}><div className="fb-label"><span className="fb-icon">{verdict === "correct" ? "OK" : verdict === "appeal" ? "..." : "!"}</span>{verdict === "correct" ? "Evidence verified" : verdict === "appeal" ? "Awaiting review" : "Needs revision"}</div><p style={{ fontSize: 13, marginTop: 4, color: "var(--text)" }}>Rule: {aiFeedback?.ruleCheck ?? rule}</p>{verdict === "revise" && <div className="fb-hint">{answerRevealed ? "Answer key: " : "Hint: "}{answerRevealed ? acceptedAnswers.join("; ") : aiFeedback?.hint ?? rubric}</div>}{answerRevealed && <button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Continue with guidance</button>}{!answerRevealed && !appealOpen && verdict === "revise" && <button className="btn btn-ghost btn-sm" onClick={onAppealOpen} style={{ marginTop: 12 }} type="button">Challenge this result</button>}{appealOpen && <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}><label className="label">Optional explanation</label><textarea className="input" placeholder="Tell your teacher what you intended." style={{ marginTop: 6 }} /><button className="btn btn-secondary btn-sm" onClick={onAppealSubmit} style={{ marginTop: 8 }} type="button">Submit challenge</button></div>}{attempts > 0 && <p style={{ fontSize: 12, marginTop: 8 }}>Attempts: {attempts}</p>}</div>;
}
