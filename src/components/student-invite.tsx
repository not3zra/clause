"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { evidenceCards, missionStages, stageGuidance, stageIsCorrect, type MissionStageId } from "../lib/mission";
import type { GradingResult } from "../lib/grading";
import type { RoomStage } from "../lib/room-stages";
import { validateStudentRegistration } from "../lib/students";

type Invite = { assignmentId: string; room: { title: string; story: string; theme: string; stageCount: number }; version: { id: string; stages: Array<{ id: string; ordinal: number; title: string; prompt: string; rule: string; token: string; item_type: RoomStage["itemType"]; accepted_answers: string[]; rubric: string; hints: string[]; items: Array<{ prompt: string; accepted_answers: string[] }> }> } };
type Attempt = { id: string; current_stage: number; recovered_tokens: string[]; completed_at: string | null; hints_used: number; score?: number; elapsed_seconds?: number; stage_results: Record<string, unknown> };
type Transition = { title: string; explanation: string; finalClue: boolean };

export function StudentInvite({ inviteToken }: { inviteToken: string }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [form, setForm] = useState({ fullName: "", rollNumber: "" });
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [message, setMessage] = useState("Loading invite...");

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const loadAttempt = useCallback(async (assignmentId: string) => {
    const response = await fetch(`/api/attempts/${assignmentId}`);
    if (response.ok) {
      const data = await response.json();
      setAttempt(data as Attempt);
    }
  }, []);

  useEffect(() => { void (async () => { const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`); const payload = await response.json(); if (!response.ok) { setMessage(payload.error); return; } setInvite(payload); setAttempt((payload.attempt as Attempt | null) ?? null); setMessage(""); const { data: { user } } = await supabase.auth.getUser(); if (user) await loadAttempt(payload.assignmentId); })(); }, [inviteToken]);

  const register = async (event: FormEvent) => {
    event.preventDefault(); const valid = validateStudentRegistration(form);
    if (!valid.ok) { setMessage(Object.values(valid.errors).join(" ")); return; }
    setMessage("Creating your mission...");
    const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: valid.value.fullName, rollNumber: valid.value.rollNumber }) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? Object.values(payload.errors ?? {}).join(" ")); return; }
    setCredentials({ username: valid.value.username, password: valid.value.password });
    const { error } = await supabase.auth.signInWithPassword({ email: payload.authEmail, password: valid.value.password });
    if (error) { setMessage(error.message); return; }
    await loadAttempt(payload.assignmentId); setMessage("Your mission is ready. Start when you are ready.");
  };

  if (message && !invite) return <main className="mx-auto max-w-xl px-5 py-16"><div className="card card-lg" role="status">{message}</div></main>;
  if (!invite) return null;
  if (attempt) return <AssignedMission attempt={attempt} invite={invite} onAttempt={setAttempt} onMessage={setMessage} supabase={supabase} />;
  return <main className="mx-auto max-w-xl px-5 py-12"><div className="card card-lg"><p className="eyebrow">Room invite</p><h1 className="mt-2 text-3xl font-black" style={{ fontFamily: "var(--font-display)" }}>{invite.room.title}</h1><p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Register to join this {invite.room.stageCount}-stage {invite.room.theme} mission. We do not collect your email address.</p>{!credentials ? <form className="mt-6 space-y-4" onSubmit={register}><label className="label">Full name<input className="input mt-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="label">Roll number<input className="input mt-2" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></label><button className="btn btn-primary w-full" type="submit">Join mission</button></form> : <div className="card-sm mt-6" style={{ background: "var(--success-light)", borderColor: "var(--success)" }}><p style={{ fontWeight: 700, fontSize: 14 }}>Account created</p><p style={{ fontSize: 13, marginTop: 4, color: "var(--text-secondary)" }}>Save these credentials to sign back in later.</p><div style={{ marginTop: 12, fontSize: 13 }}><strong>Username:</strong> {credentials.username}<br /><strong>Password:</strong> {credentials.password}</div></div>}{message && <p style={{ marginTop: 16, fontSize: 14, color: "var(--text-secondary)" }} role="status">{message}</p>}</div></main>;
}

function AssignedMission({ attempt, invite, onAttempt, onMessage, supabase }: { attempt: Attempt; invite: Invite; onAttempt: (attempt: Attempt) => void; onMessage: (message: string) => void; supabase: ReturnType<typeof createBrowserClient> }) {
  const [phase, setPhase] = useState<"launch" | "stages" | "lock" | "success">(attempt.completed_at ? "success" : "launch");
  const [answer, setAnswer] = useState(missionStages[0].prompt);
  const [sorts, setSorts] = useState<Record<string, string>>({});
  const [rewrite, setRewrite] = useState(["Neither the map nor the notebook were in the drawer.", "The clues was nearby."]);
  const [verdict, setVerdict] = useState<"idle" | "correct" | "revise" | "appeal">("idle");
  const [explanation, setExplanation] = useState("");
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealSubmitted, setAppealSubmitted] = useState(false);
  const [appealStatus, setAppealStatus] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<GradingResult | null>(null);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [seconds, setSeconds] = useState(720);
  const [tokenPop, setTokenPop] = useState<MissionStageId | null>(null);
  const stage = missionStages[Math.min(attempt.current_stage, missionStages.length - 1)];
  const stageIndex = Math.min(attempt.current_stage, missionStages.length - 1);
  const solved = attempt.current_stage >= missionStages.length || Boolean(attempt.completed_at);
  const stageResult = attempt.stage_results[stage.id] as { attempts?: number } | undefined;
  const attemptsUsed = stageResult?.attempts ?? 0;
  const themeClass = invite.room.theme.toLowerCase().replace(/\s+/g, "-");
  const completed = attempt.recovered_tokens as MissionStageId[];
  const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => { const timer = window.setInterval(() => setSeconds((v) => Math.max(0, v - 1)), 1000); return () => window.clearInterval(timer); }, []);

  useEffect(() => { if (!transition) return; const timer = window.setTimeout(() => setTransition(null), 2400); return () => window.clearTimeout(timer); }, [transition]);
  useEffect(() => { void (async () => { const result = await fetch("/api/student-mission"); const payload = await result.json() as { appeals?: Array<{ status: string }> }; setAppealStatus(payload.appeals?.[0]?.status ?? null); })(); }, [attempt.id]);

  const completeStage = async (id: MissionStageId) => {
    setTokenPop(id);
    setTimeout(() => setTokenPop(null), 500);
    const token = stage.token;
    const recovered = [...attempt.recovered_tokens, token];
    const complete = recovered.length === missionStages.length;
    const stageResults = { ...attempt.stage_results, [id]: { correct: true, submittedAt: new Date().toISOString(), verdict: aiFeedback?.verdict ?? "deterministic" } };
    const { data, error } = await supabase.from("mission_attempts").update({
      started_at: new Date().toISOString(), current_stage: recovered.length, recovered_tokens: recovered, stage_results: stageResults, completed_at: complete ? new Date().toISOString() : null
    }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results").single();
    if (error) { onMessage(error.message); return; }
    onAttempt(data as Attempt);
    setVerdict("correct");
  };

  const markWrong = () => {
    const nextAttempts = attemptsUsed + 1;
    const stageResults = { ...attempt.stage_results, [stage.id]: { attempts: nextAttempts, correct: false } };
    setVerdict("revise");
    setRevealed(nextAttempts >= 3);
    onMessage(nextAttempts >= 3 ? "The answer key is now available with the rule explanation." : `Almost. You have ${3 - nextAttempts} attempt${nextAttempts === 2 ? "" : "s"} left.`);
    supabase.from("mission_attempts").update({ hints_used: attempt.hints_used + 1, stage_results: stageResults }).eq("id", attempt.id).then(() => {
      onAttempt({ ...attempt, hints_used: attempt.hints_used + 1, stage_results: stageResults });
    });
  };

  const submit = async () => {
    if (solved) return;
    const submitted = stage.id === "surgery" ? answer : stage.id === "sort" ? sorts : rewrite;
    let correct = stageIsCorrect(stage.id, submitted);
    if (stage.id !== "sort") {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch("/api/grading", { method: "POST", headers: { "Content-Type": "application/json", ...(session.session ? { Authorization: `Bearer ${session.session.access_token}` } : {}) }, body: JSON.stringify({ original: stage.prompt, submitted: Array.isArray(submitted) ? submitted.join(" ") : submitted, targetRule: stage.rule, rubric: stageGuidance[stage.id].reasoning, grade: 7, subtopic: "subject-verb agreement" }) });
      const graded = await response.json() as GradingResult | { error: string };
      if (response.ok && "verdict" in graded) { setAiFeedback(graded); correct = graded.verdict === "correct" || graded.verdict === "correct_with_improvement" || graded.verdict === "provisional"; }
    }
    if (!correct) { markWrong(); return; }
    setVerdict("correct");
    await completeStage(stage.id);
    onMessage(attempt.recovered_tokens.length + 1 >= missionStages.length ? "Case closed. Your result was saved." : "Stage saved. Continue when you are ready.");
  };

  const advanceStage = () => {
    if (attempt.current_stage + 1 < missionStages.length) {
      setVerdict("idle");
      setRevealed(false);
      setAppealOpen(false);
      setAnswer(missionStages[Math.min(attempt.current_stage + 1, 2)].prompt);
      const recovered = [...attempt.recovered_tokens, stage.token];
      onAttempt({ ...attempt, current_stage: recovered.length, recovered_tokens: recovered });
    } else {
      setPhase("lock");
    }
  };

  const submitAppeal = async () => {
    const { error } = await supabase.from("appeals").insert({ mission_attempt_id: attempt.id, stage_id: stage.id, student_explanation: explanation });
    if (!error) setAppealStatus("pending");
    onMessage(error ? error.message : "Challenge submitted. You can continue playing while your teacher reviews it.");
    setAppealSubmitted(true);
    setAppealOpen(false);
    setVerdict("appeal");
  };

  const continueWithGuidance = async () => {
    const recovered = [...attempt.recovered_tokens, stage.token];
    const complete = recovered.length === missionStages.length;
    const stageResults = { ...attempt.stage_results, [stage.id]: { attempts: attemptsUsed, correct: false, guided: true } };
    const { data, error } = await supabase.from("mission_attempts").update({
      current_stage: recovered.length, recovered_tokens: recovered, stage_results: stageResults, completed_at: complete ? new Date().toISOString() : null
    }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results").single();
    if (error) onMessage(error.message);
    else {
      onAttempt(data as Attempt);
      setVerdict("idle");
      setRevealed(false);
      if (complete) { setPhase("success"); }
      onMessage("Guided answer saved. Opening the next piece of evidence.");
    }
  };

  if (phase === "launch") return (
    <main className={`room-launch theme-${themeClass}`}>
      <span className="launch-icon">{["🕵️", "🏰", "🚀"][Math.floor(Math.random() * 3)]}</span>
      <p className="eyebrow">{invite.room.theme} mission</p>
      <h1>{invite.room.title}</h1>
      <p className="launch-desc">Recover three evidence tokens by solving grammar puzzles. Collect all tokens to unlock the final case file.</p>
      <div className="launch-stages">
        {missionStages.map((s, i) => (
          <div className={`launch-stage animate-slide-up-d${i + 1}`} key={s.id}>
            <span className="stage-icon">{["✏️", "📋", "📝"][i]}</span>
            <span>{s.title}</span>
          </div>
        ))}
      </div>
      <div className="launch-actions">
        <button className="btn btn-primary" onClick={() => setPhase("stages")} type="button">Begin mission</button>
      </div>
    </main>
  );

  if (phase === "success") return (
    <main className={`success theme-${themeClass}`}>
      <div className="confetti-container">
        {Array.from({ length: 10 }).map((_, i) => <div className="confetti-piece" key={i} />)}
      </div>
      <div className="card card-lg">
        <div className="success-icon success-bounce">OK</div>
        <p className="eyebrow" style={{ marginTop: 16 }}>Mission complete</p>
        <h1 style={{ fontSize: 28 }}>Case closed.</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>You recovered every token and cracked the case.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          {missionStages.map((item) => <span className="token earned" key={item.id}>{item.token}</span>)}
        </div>
      </div>
    </main>
  );

  if (phase === "lock") return (
    <main className={`lock theme-${themeClass}`}>
      <div className="card card-lg">
        <p className="eyebrow">Final lock</p>
        <h1>Open the cabinet</h1>
        <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>Place your recovered tokens in stage order.</p>
        <div className="lock-slots">
          {missionStages.map((_, i) => (
            <div className={`lock-slot ${attempt.recovered_tokens[i] ? "filled" : ""}`} key={i}>
              {attempt.recovered_tokens[i] ?? ""}
            </div>
          ))}
        </div>
        <div className="lock-tokens">
          {missionStages.map((s) => (
            <button
              className={`token ${completed.includes(s.id) ? "earned" : ""}`}
              disabled={!completed.includes(s.id) || attempt.recovered_tokens.includes(s.token)}
              key={s.token}
              onClick={() => {
                const next = [...attempt.recovered_tokens, s.token];
                onAttempt({ ...attempt, recovered_tokens: next });
                if (next.length === missionStages.length) setPhase("success");
              }}
              type="button"
            >
              {s.token}
            </button>
          ))}
        </div>
        <div className="lock-actions">
          <button className="btn btn-ghost btn-sm" onClick={() => onAttempt({ ...attempt, recovered_tokens: [] })} type="button">Clear</button>
        </div>
        {attempt.recovered_tokens.length === 3 && attempt.recovered_tokens.join(" ") !== missionStages.map((s) => s.token).join(" ") && (
          <p className="lock-error shake" key={attempt.recovered_tokens.join("")}>That order does not open the lock. Try the stage sequence.</p>
        )}
      </div>
    </main>
  );

  return (
    <main className={`mission-player theme-${themeClass}`}>
      <div className="mission-player-header header-shimmer">
        <div>
          <span className="badge">{invite.room.theme}</span>
          <h1>{invite.room.title}</h1>
          <p>Stage {attempt.current_stage + 1} of {missionStages.length} &middot; Collect all tokens to unlock the case</p>
        </div>
        <div className={`mission-timer ${seconds <= 60 ? "timer-urgent" : ""}`}>{time}</div>
      </div>
      <div className="progress-rail">
        {missionStages.map((ms, i) => (
          <div className={`progress-step ${completed.includes(ms.id) ? "done" : ""}`} key={ms.id}>
            <div className={`progress-step-marker ${completed.includes(ms.id) ? "done" : stageIndex === i ? "current" : ""}`}>
              {completed.includes(ms.id) ? "OK" : i + 1}
            </div>
            <div className="progress-step-label">
              <strong>{ms.title}</strong>
              <small>{completed.includes(ms.id) ? ms.token : stageIndex === i ? "In progress" : "Locked"}</small>
            </div>
            {i < missionStages.length - 1 && <div className={`progress-step-connector ${completed.includes(ms.id) ? "done" : ""}`} />}
          </div>
        ))}
      </div>
      <div className="game-layout">
        <div className="game-main stage-enter" key={stageIndex}>
          <p className="eyebrow">Stage {stageIndex + 1} of {missionStages.length}</p>
          <h2>{stage.title}</h2>
          <p className="stage-desc">{stage.prompt}</p>
          {stage.id === "surgery" && (
            <>
              <input aria-label="Correct the sentence" className="input animate-slide-up-d1" onChange={(e) => setAnswer(e.target.value)} style={{ marginTop: 24 }} value={answer} />
              <div className="animate-slide-up-d2" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 12 }}>
                <button className="btn btn-primary" onClick={submit} type="button">File report</button>
                <button className="btn btn-ghost btn-sm" onClick={() => setAnswer(missionStages[0].prompt)} type="button">Reset to original</button>
              </div>
            </>
          )}
          {stage.id === "sort" && (
            <>
              <div className="sort-count animate-slide-up-d1">{Object.keys(sorts).filter((k) => sorts[k] === evidenceCards.find((c) => c.sentence === k)?.answer).length} of {evidenceCards.length} correct</div>
              <div className="animate-slide-up-d2" style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {evidenceCards.map((card, ci) => (
                  <div className={`sort-card card-slide-in-d${ci}`} key={card.sentence}>
                    <p>{card.sentence}</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      {["Agrees", "Needs revision"].map((choice) => (
                        <button
                          className={`btn btn-sm ${sorts[card.sentence] === choice ? "btn-primary" : "btn-secondary"}`}
                          key={choice}
                          onClick={() => setSorts({ ...sorts, [card.sentence]: choice })}
                          type="button"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button className="btn btn-primary animate-slide-up-d3" disabled={revealed} onClick={submit} style={{ marginTop: 20 }} type="button">Submit evidence</button>
            </>
          )}
          {stage.id === "rewrite" && (
            <>
              <div className="animate-slide-up-d1" style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 20 }}>
                {rewrite.map((s, i) => (
                  <input aria-label={`Rewrite sentence ${i + 1}`} className="input" key={i} onChange={(e) => setRewrite(rewrite.map((item, idx) => idx === i ? e.target.value : item))} value={s} />
                ))}
              </div>
              <button className="btn btn-primary animate-slide-up-d2" onClick={submit} style={{ marginTop: 20 }} type="button">Submit case file</button>
            </>
          )}
          <FeedbackPanelStudent
            answerRevealed={revealed}
            appealOpen={appealOpen}
            appealSubmitted={appealSubmitted}
            attempts={attemptsUsed}
            onAppealOpen={() => setAppealOpen(true)}
            onAppealSubmit={submitAppeal}
            onGuidedContinue={continueWithGuidance}
            rule={stage.rule}
            stageId={stage.id}
            verdict={verdict}
            aiFeedback={aiFeedback}
            appealStatus={appealStatus}
          />
        </div>
        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="evidence-locker">
            <p className="eyebrow">Evidence Locker</p>
            <div className="tokens">
              {missionStages.map((item) => (
                <span className={`token ${completed.includes(item.id) ? "earned" : ""} ${tokenPop === item.id ? "token-pop" : ""}`} key={item.id}>
                  {completed.includes(item.id) ? item.token : "Locked"}
                </span>
              ))}
            </div>
            <p className="locker-stats">{completed.length} of {missionStages.length} tokens recovered</p>
          </div>
          <div className="agent-note">
            <div>
              <strong>Agent Clause</strong>
              {verdict === "correct" ? "Good work! One step closer to cracking the case." : verdict === "revise" ? "That doesn't look right. Check the subject-verb match carefully." : "Examine each puzzle carefully before filing your report."}
            </div>
          </div>
        </aside>
      </div>
      {appealStatus && <p style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--warning)", textAlign: "center" }}>Appeal status: {appealStatus === "pending" ? "Awaiting review" : appealStatus}</p>}
    </main>
  );
}

function FeedbackPanelStudent({
  answerRevealed, appealOpen, appealSubmitted, attempts, onAppealOpen, onAppealSubmit, onGuidedContinue, rule, stageId, verdict, aiFeedback, appealStatus
}: {
  answerRevealed: boolean; appealOpen: boolean; appealSubmitted: boolean; attempts: number;
  onAppealOpen: () => void; onAppealSubmit: () => void; onGuidedContinue: () => void;
  rule: string; stageId: MissionStageId; verdict: "idle" | "correct" | "revise" | "appeal";
  aiFeedback: GradingResult | null; appealStatus: string | null;
}) {
  if (verdict === "idle") return null;
  const label = verdict === "correct" ? "Evidence verified" : verdict === "appeal" ? "Awaiting review" : "Needs revision";
  const hint = attempts > 1 ? "Final hint: check the subject-verb match carefully before submitting again." : "Hint: find the real subject before changing the verb.";
  return (
    <div className={`feedback-panel ${verdict === "correct" ? "correct" : verdict === "appeal" ? "appeal" : "revise"}`}>
      <div className="fb-label">
        <span className="fb-icon">{verdict === "correct" ? "OK" : verdict === "appeal" ? "..." : "!"}</span>
        {label}
      </div>
      <p style={{ fontSize: 13, marginTop: 4, color: "var(--text)" }}>Rule: {aiFeedback?.ruleCheck ?? rule}</p>
      {verdict === "revise" && (
        <div className="fb-hint">{answerRevealed ? "Answer revealed after three attempts." : aiFeedback?.feedback ?? hint}</div>
      )}
      {aiFeedback && !answerRevealed && verdict === "revise" && (
        <div className="fb-hint">{aiFeedback.hint}{aiFeedback.provisionalCredit ? " Provisional credit recorded." : ""}</div>
      )}
      {answerRevealed && (
        <div className="fb-explanation">
          <strong>Correct answer: </strong>{stageGuidance[stageId].answer}<br />
          <strong>Why: </strong>{stageGuidance[stageId].reasoning}
          <button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Continue with guidance</button>
        </div>
      )}
      {verdict === "correct" && (
        <button className="btn btn-secondary btn-sm" onClick={onGuidedContinue} style={{ marginTop: 12 }} type="button">Continue to next stage</button>
      )}
      {appealSubmitted && <div className="fb-hint">Your challenge is awaiting teacher review. Keep playing.</div>}
      {appealStatus && <p style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "var(--warning)" }}>Appeal status: {appealStatus === "pending" ? "Awaiting review" : appealStatus}</p>}
      {!answerRevealed && !appealOpen && verdict === "revise" && !appealSubmitted && (
        <button className="btn btn-ghost btn-sm" onClick={onAppealOpen} style={{ marginTop: 12 }} type="button">Challenge this result</button>
      )}
      {!answerRevealed && appealOpen && (
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
          <label className="label">Optional explanation</label>
          <textarea className="input" placeholder="Tell your teacher what you intended." style={{ marginTop: 6 }} />
          <button className="btn btn-secondary btn-sm" onClick={onAppealSubmit} style={{ marginTop: 8 }} type="button">Submit challenge</button>
        </div>
      )}
    </div>
  );
}
