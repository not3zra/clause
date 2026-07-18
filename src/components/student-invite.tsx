"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { validateStudentRegistration } from "../lib/students";

type Invite = { assignmentId: string; room: { title: string; theme: string; stageCount: number } };
type Attempt = { id: string; current_stage: number; recovered_tokens: string[]; completed_at: string | null };
const tokens = ["CASE", "FILE", "OPEN"];

export function StudentInvite({ inviteToken }: { inviteToken: string }) {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [form, setForm] = useState({ fullName: "", rollNumber: "", username: "", password: "" });
  const [message, setMessage] = useState("Loading invite…");

  const loadAttempt = useCallback(async (assignmentId: string) => {
    const { data: enrolment } = await supabase.from("student_assignments").select("id").eq("assignment_id", assignmentId).maybeSingle();
    if (!enrolment) return;
    const { data, error } = await supabase.from("mission_attempts").select("id, current_stage, recovered_tokens, completed_at").eq("student_assignment_id", enrolment.id).single();
    if (error) setMessage(error.message); else { setAttempt(data as Attempt); setMessage(""); }
  }, [supabase]);

  useEffect(() => { void (async () => { const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`); const payload = await response.json(); if (!response.ok) { setMessage(payload.error); return; } setInvite(payload); setMessage(""); const { data: { user } } = await supabase.auth.getUser(); if (user) await loadAttempt(payload.assignmentId); })(); }, [inviteToken, supabase, loadAttempt]);

  const register = async (event: FormEvent) => {
    event.preventDefault(); const valid = validateStudentRegistration(form);
    if (!valid.ok) { setMessage(Object.values(valid.errors).join(" ")); return; }
    setMessage("Creating your mission…");
    const response = await fetch(`/api/invites/${encodeURIComponent(inviteToken)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(valid.value) });
    const payload = await response.json();
    if (!response.ok) { setMessage(payload.error ?? Object.values(payload.errors ?? {}).join(" ")); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: payload.authEmail, password: valid.value.password });
    if (error) { setMessage(error.message); return; }
    await loadAttempt(payload.assignmentId); setMessage("Your mission is ready. Start when you are ready.");
  };

  const completeStage = async () => {
    if (!attempt || attempt.completed_at) return;
    const token = tokens[attempt.current_stage];
    const recovered = [...attempt.recovered_tokens, token];
    const complete = recovered.length === tokens.length;
    const { data, error } = await supabase.from("mission_attempts").update({ started_at: new Date().toISOString(), current_stage: recovered.length, recovered_tokens: recovered, completed_at: complete ? new Date().toISOString() : null }).eq("id", attempt.id).select("id, current_stage, recovered_tokens, completed_at").single();
    if (error) setMessage(error.message); else { setAttempt(data as Attempt); setMessage(complete ? "Case closed. Your result was saved." : "Stage saved. You can safely refresh and resume."); }
  };

  if (message && !invite) return <main className="mx-auto max-w-xl px-5 py-16"><div className="panel" role="status">{message}</div></main>;
  if (!invite) return null;
  if (attempt) return <main className="mx-auto max-w-xl px-5 py-12"><div className="panel"><p className="eyebrow">Your mission</p><h1 className="mt-2 text-3xl font-black">{invite.room.title}</h1><p className="mt-2 text-[#59677a]">{invite.room.theme} · Stage {Math.min(attempt.current_stage + 1, 3)} of 3</p><div className="mt-6 flex gap-2">{tokens.map((token, index) => <span className={`token ${index < attempt.current_stage ? "token-ready" : ""}`} key={token}>{index < attempt.current_stage ? token : "Locked"}</span>)}</div>{attempt.completed_at ? <p className="mt-6 text-lg font-black text-[#245c45]">Case closed. Your saved result is ready.</p> : <><div className="mt-6 rounded-md border border-[#d8dee8] p-4"><strong>{["Sentence Surgery", "Evidence Sort", "Case File Rewrite"][attempt.current_stage]}</strong><p className="mt-2 text-sm text-[#59677a]">Complete this deterministic mission stage to recover the next clue.</p></div><button className="primary-action mt-5" onClick={completeStage} type="button">Complete stage</button></>}{message && <p className="mt-4 text-sm text-[#315b85]" role="status">{message}</p>}</div></main>;
  return <main className="mx-auto max-w-xl px-5 py-12"><div className="panel"><p className="eyebrow">Room invite</p><h1 className="mt-2 text-3xl font-black">{invite.room.title}</h1><p className="mt-2 text-[#59677a]">Register to join this {invite.room.stageCount}-stage {invite.room.theme} mission. We do not collect your email address.</p><form className="mt-6 space-y-4" onSubmit={register}><label className="block text-sm font-bold">Full name<input className="input-shell mt-2" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label className="block text-sm font-bold">Roll number<input className="input-shell mt-2" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} required /></label><label className="block text-sm font-bold">Username<input className="input-shell mt-2" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required /></label><label className="block text-sm font-bold">Password<input className="input-shell mt-2" type="password" minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label><button className="primary-action w-full" type="submit">Join mission</button></form>{message && <p className="mt-4 text-sm text-[#315b85]" role="status">{message}</p>}</div></main>;
}
