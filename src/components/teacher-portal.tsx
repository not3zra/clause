"use client";

import { createBrowserClient } from "@supabase/ssr";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { validateClassInput } from "../lib/classes";
import { createInvitePath, RoomInput, validateRoomInput } from "../lib/rooms";
import { scoreForProgress } from "../lib/mission";
import { summarizeAttempts } from "../lib/teacher-metrics";

type TeacherClass = { id: string; name: string; grade: number };
type Room = { id: string; title: string; status: "draft" | "published" | "closed"; reviewed_at: string | null; validated_at: string | null };
type Assignment = { invite_token: string; marks_visible: boolean };
type AttemptRow = { id: string; current_stage: number; completed_at: string | null; hints_used: number; stage_results: Record<string, { attempts?: number; correct?: boolean; guided?: boolean; verdict?: string }>; student_assignment: { student: { full_name: string; roll_number: string } | null } | null };
type Appeal = { id: string; stage_id: string; status: string; student_explanation: string; teacher_comment: string; mission_attempt: { student_assignment: { student: { full_name: string } | null } | null } | null };

const initialRoom: RoomInput = { classId: "", topic: "Subject-verb agreement", subtopic: "Singular and plural subjects", theme: "Detective Office", stageCount: 3, marksVisible: false };

export function TeacherPortal() {
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!), []);
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [teacherId, setTeacherId] = useState<string | null>(null);
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState(7);
  const [roomInput, setRoomInput] = useState<RoomInput>(initialRoom);
  const [room, setRoom] = useState<Room | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);

  const loadClasses = useCallback(async (id: string) => {
    const { data, error } = await supabase.from("classes").select("id, name, grade").order("created_at", { ascending: false });
    if (error) setMessage(error.message); else setClasses((data ?? []) as TeacherClass[]);
    setTeacherId(id);
  }, [supabase]);

  const loadResults = useCallback(async () => {
    const [attemptResult, appealResult] = await Promise.all([
      supabase.from("mission_attempts").select("id, current_stage, completed_at, hints_used, stage_results, student_assignment:student_assignments!inner(student:student_profiles(full_name, roll_number))").order("updated_at", { ascending: false }),
      supabase.from("appeals").select("id, stage_id, status, student_explanation, teacher_comment, mission_attempt:mission_attempts!inner(student_assignment:student_assignments!inner(student:student_profiles(full_name)))").order("created_at", { ascending: false }),
    ]);
    if (attemptResult.error) setMessage(attemptResult.error.message); else setAttempts((attemptResult.data ?? []) as unknown as AttemptRow[]);
    if (appealResult.error) setMessage(appealResult.error.message); else setAppeals((appealResult.data ?? []) as unknown as Appeal[]);
  }, [supabase]);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) { void loadClasses(data.user.id); void loadResults(); } }); }, [supabase, loadClasses, loadResults]);

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault(); setMessage(""); setBusy(true);
    const result = mode === "sign-up"
      ? await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (result.data.user) await loadClasses(result.data.user.id);
  };

  const createClass = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateClassInput({ name: className, grade });
    if (!result.ok || !teacherId) { setMessage(result.ok ? "Sign in to create a class." : Object.values(result.errors).join(" ")); return; }
    setBusy(true);
    const { data, error } = await supabase.from("classes").insert({ teacher_id: teacherId, ...result.value }).select("id, name, grade").single();
    setBusy(false);
    if (error) setMessage(error.message);
    else { setClasses((items) => [data as TeacherClass, ...items]); setRoomInput((input) => ({ ...input, classId: data.id })); setClassName(""); setMessage("Class created. You can now create a room."); }
  };

  const createDraft = async (event: FormEvent) => {
    event.preventDefault();
    const result = validateRoomInput(roomInput);
    if (!result.ok || !teacherId) { setMessage(result.ok ? "Sign in to create a room." : Object.values(result.errors).join(" ")); return; }
    setBusy(true);
    const title = `${result.value.theme}: ${result.value.topic}`;
    const { data, error } = await supabase.from("rooms").insert({
      teacher_id: teacherId, class_id: result.value.classId, title, topic: result.value.topic, subtopic: result.value.subtopic,
      theme: result.value.theme, stage_count: result.value.stageCount,
    }).select("id, title, status, reviewed_at, validated_at").single();
    setBusy(false);
    if (error) setMessage(error.message);
    else { setRoom(data as Room); setAssignment(null); setMessage("Draft saved. Review the generated room before validation."); }
  };

  const reviewRoom = async () => {
    if (!room) return;
    setBusy(true);
    const { data, error } = await supabase.from("rooms").update({ reviewed_at: new Date().toISOString() }).eq("id", room.id).select("id, title, status, reviewed_at, validated_at").single();
    setBusy(false);
    if (error) setMessage(error.message); else { setRoom(data as Room); setMessage("Teacher review recorded. Run validation to unlock publishing."); }
  };

  const validateRoom = async () => {
    if (!room?.reviewed_at) { setMessage("Record your review before validating this room."); return; }
    setBusy(true);
    const { data, error } = await supabase.from("rooms").update({ validated_at: new Date().toISOString() }).eq("id", room.id).select("id, title, status, reviewed_at, validated_at").single();
    setBusy(false);
    if (error) setMessage(error.message); else { setRoom(data as Room); setMessage("Validation passed: grammar, safety, answer-key, and clue checks are ready for publishing."); }
  };

  const publishRoom = async () => {
    if (!room?.reviewed_at || !room.validated_at || !teacherId) { setMessage("Review and validation are required before publishing."); return; }
    setBusy(true);
    const assignmentResult = await supabase.from("assignments").insert({ room_id: room.id, teacher_id: teacherId, marks_visible: roomInput.marksVisible }).select("invite_token, marks_visible").single();
    if (assignmentResult.error) { setBusy(false); setMessage(assignmentResult.error.message); return; }
    const roomResult = await supabase.from("rooms").update({ status: "published" }).eq("id", room.id).select("id, title, status, reviewed_at, validated_at").single();
    setBusy(false);
    if (roomResult.error) setMessage(roomResult.error.message);
    else { setRoom(roomResult.data as Room); setAssignment(assignmentResult.data as Assignment); setMessage("Room published. Its invite link is now ready to share."); }
  };

  const copyInvite = async () => {
    if (!assignment) return;
    const url = `${window.location.origin}${createInvitePath(assignment.invite_token)}`;
    try { await navigator.clipboard.writeText(url); setMessage("Invite link copied. It is scoped to this published room."); }
    catch { setMessage(`Copy this room-specific invite link: ${url}`); }
  };

  const resolveAppeal = async (appeal: Appeal, status: "accepted" | "denied" | "overridden", teacherComment: string) => {
    setBusy(true);
    const { error: auditError } = await supabase.from("appeal_decisions").insert({ appeal_id: appeal.id, teacher_id: teacherId, decision: status, teacher_comment: teacherComment.trim() });
    if (auditError) { setBusy(false); setMessage(auditError.message); return; }
    const { data, error } = await supabase.from("appeals").update({ status, teacher_comment: teacherComment.trim(), reviewed_at: new Date().toISOString() }).eq("id", appeal.id).select("id, stage_id, status, student_explanation, teacher_comment, mission_attempt:mission_attempts!inner(student_assignment:student_assignments!inner(student:student_profiles(full_name)))").single();
    setBusy(false);
    if (error) setMessage(error.message); else { setAppeals((items) => items.map((item) => item.id === appeal.id ? data as unknown as Appeal : item)); setMessage(`Appeal ${status}.`); }
  };

  if (!teacherId) return <section className="mx-auto max-w-md px-5 py-12"><div className="card card-lg"><p className="eyebrow">Teacher access</p><h1 className="mt-2 text-3xl font-black">{mode === "sign-in" ? "Sign in" : "Create teacher account"}</h1><form className="mt-6 space-y-4" onSubmit={submitAuth}>{mode === "sign-up" && <label className="block text-sm font-bold">Name<input className="input mt-2" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required /></label>}<label className="block text-sm font-bold">Email<input className="input mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label><label className="block text-sm font-bold">Password<input className="input mt-2" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></label><button className="btn btn-primary w-full" disabled={busy} type="submit">{busy ? "Workingâ€¦" : mode === "sign-in" ? "Sign in" : "Create account"}</button></form><button className="btn btn-ghost mt-4" onClick={() => setMode(mode === "sign-in" ? "sign-up" : "sign-in")} type="button">{mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>{message && <p className="mt-4 text-sm text-[#8b352a]" role="status">{message}</p>}</div></section>;

  return <section className="mx-auto max-w-3xl px-5 py-12"><div className="card card-lg"><p className="eyebrow">Your classes</p><h1 className="mt-2 text-3xl font-black">Create and publish a grammar room</h1><form className="mt-6 flex flex-wrap gap-3" onSubmit={createClass}><input aria-label="Class name" className="input flex-1" placeholder="e.g. 7B Grammar Lab" value={className} onChange={(e) => setClassName(e.target.value)} /><select aria-label="Grade" className="input w-32" value={grade} onChange={(e) => setGrade(Number(e.target.value))}>{[6, 7, 8, 9].map((value) => <option key={value} value={value}>Grade {value}</option>)}</select><button className="btn btn-secondary" disabled={busy} type="submit">Create class</button></form><ul className="mt-5 space-y-2">{classes.map((item) => <li className="class-list-item" key={item.id}><strong>{item.name}</strong><span className="ml-2 text-sm text-[#657286]">Grade {item.grade}</span></li>)}</ul></div>

  <div className="panel mt-6"><p className="eyebrow">Room workflow</p><h2 className="mt-2 text-2xl font-black">{room ? room.title : "New grammar room"}</h2>{!room ? <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={createDraft}><label className="text-sm font-bold">Class<select aria-label="Room class" className="input mt-2" value={roomInput.classId} onChange={(e) => setRoomInput({ ...roomInput, classId: e.target.value })}><option value="">Choose a class</option>{classes.map((item) => <option key={item.id} value={item.id}>{item.name} (Grade {item.grade})</option>)}</select></label><label className="text-sm font-bold">Theme<select aria-label="Theme" className="input mt-2" value={roomInput.theme} onChange={(e) => setRoomInput({ ...roomInput, theme: e.target.value })}>{["Detective Office", "Cursed Castle", "Sci-Fi Lab"].map((theme) => <option key={theme}>{theme}</option>)}</select></label><label className="text-sm font-bold">Topic<input aria-label="Grammar topic" className="input mt-2" value={roomInput.topic} onChange={(e) => setRoomInput({ ...roomInput, topic: e.target.value })} /></label><label className="text-sm font-bold">Subtopic<input aria-label="Grammar subtopic" className="input mt-2" value={roomInput.subtopic} onChange={(e) => setRoomInput({ ...roomInput, subtopic: e.target.value })} /></label><label className="text-sm font-bold">Stages<select aria-label="Stages" className="input mt-2" value={roomInput.stageCount} onChange={(e) => setRoomInput({ ...roomInput, stageCount: Number(e.target.value) })}><option value={3}>3 stages</option><option value={4}>4 stages</option></select></label><label className="flex items-center gap-3 text-sm font-bold"><input checked={roomInput.marksVisible} onChange={(e) => setRoomInput({ ...roomInput, marksVisible: e.target.checked })} type="checkbox" />Show marks to students</label><button className="btn btn-primary w-fit" disabled={busy || !classes.length} type="submit">Save room draft</button></form> : <div className="mt-6 space-y-4"><div className="card-sm text-sm"><strong>Review checklist</strong><ul className="mt-2 list-disc space-y-1 pl-5 text-[#667085]"><li>Grammar rule and answer key are correct.</li><li>Content is suitable for the selected grade.</li><li>Story and clue tokens are consistent and kid-safe.</li></ul></div><div className="flex flex-wrap gap-3"><button className="btn btn-secondary" disabled={busy || Boolean(room.reviewed_at)} onClick={reviewRoom} type="button">{room.reviewed_at ? "Review recorded" : "Confirm teacher review"}</button><button className="btn btn-secondary" disabled={busy || !room.reviewed_at || Boolean(room.validated_at)} onClick={validateRoom} type="button">{room.validated_at ? "Validation passed" : "Validate room"}</button><button className="btn btn-primary" disabled={busy || room.status === "published" || !room.validated_at} onClick={publishRoom} type="button">{room.status === "published" ? "Published" : "Publish room"}</button>{assignment && <button className="btn btn-primary" onClick={copyInvite} type="button">Copy home invite link</button>}</div>{assignment && <p className="text-sm text-[#667085]">Student marks are {assignment.marks_visible ? "visible" : "hidden"} for this assignment.</p>}</div>}{message && <p className="mt-5 text-sm text-[#0f766e]" role="status">{message}</p>}</div><TeacherResults appeals={appeals} attempts={attempts} busy={busy} onRefresh={loadResults} onResolve={resolveAppeal} /></section>;
}

function TeacherResults({ appeals, attempts, busy, onRefresh, onResolve }: { appeals: Appeal[]; attempts: AttemptRow[]; busy: boolean; onRefresh: () => Promise<void>; onResolve: (appeal: Appeal, status: "accepted" | "denied" | "overridden", teacherComment: string) => Promise<void> }) {
  const [comments, setComments] = useState<Record<string, string>>({});
  const summary = summarizeAttempts(attempts.map((item) => ({ currentStage: item.current_stage, completed: Boolean(item.completed_at), hintsUsed: item.hints_used, stageResults: item.stage_results ?? {} })));
  return <div className="panel mt-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow">Class overview</p><h2 className="mt-2 text-2xl font-black">Student results</h2><p className="mt-1 text-sm text-[#667085]">Completion {summary.completion}% · First attempt {summary.firstAttemptAccuracy}% · Hints {summary.hintsUsed} · {summary.mastery}</p></div><button className="btn btn-secondary" disabled={busy} onClick={() => void onRefresh()} type="button">Refresh results</button></div><div className="mt-5 overflow-x-auto"><table className="data-table"><thead><tr><th>Student</th><th>Progress</th><th>Score</th><th>Hints</th><th>Status</th></tr></thead><tbody>{attempts.map((item) => <tr key={item.id}><td className="font-bold">{item.student_assignment?.student?.full_name ?? "Student"}<span className="ml-2 text-xs font-normal text-[#657286]">{item.student_assignment?.student?.roll_number}</span></td><td>{item.current_stage}/3 stages</td><td className="font-bold">{scoreForProgress(item.current_stage, Boolean(item.completed_at))}%</td><td>{item.hints_used}</td><td>{item.completed_at ? "Complete" : "In progress"}</td></tr>)}</tbody></table></div><div className="mt-7 border-t border-[#e8e2d7] pt-5"><p className="eyebrow">Appeals</p><h3 className="mt-2 text-lg font-black">{appeals.filter((item) => item.status === "pending").length} pending review</h3><div className="mt-4 space-y-3">{appeals.map((appeal) => <div className="appeal-card" key={appeal.id}><p className="font-bold">{appeal.mission_attempt?.student_assignment?.student?.full_name ?? "Student"} | {appeal.stage_id}</p><p className="mt-2 text-sm text-[#667085]">{appeal.student_explanation || "No explanation provided."}</p><p className="mt-2 text-xs font-bold uppercase text-[#657286]">{appeal.status}</p>{appeal.status === "pending" && <><label className="mt-3 block text-sm font-bold">Teacher comment<textarea className="input mt-2 min-h-20" onChange={(event) => setComments({ ...comments, [appeal.id]: event.target.value })} value={comments[appeal.id] ?? ""} /></label><div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-secondary" disabled={busy} onClick={() => void onResolve(appeal, "accepted", comments[appeal.id] ?? "")} type="button">Accept</button><button className="btn btn-secondary" disabled={busy} onClick={() => void onResolve(appeal, "denied", comments[appeal.id] ?? "")} type="button">Deny</button><button className="btn btn-secondary" disabled={busy} onClick={() => void onResolve(appeal, "overridden", comments[appeal.id] ?? "")} type="button">Override</button></div></>}</div>)}</div></div></div>;
}
