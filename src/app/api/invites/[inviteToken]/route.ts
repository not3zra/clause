import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { hashOpaqueToken } from "@/lib/student-sessions";
import { studentAuthEmail, validateStudentRegistration } from "@/lib/students";
import { resolveStudentSession, studentSessionCookie } from "@/lib/student-session-server";
import { anonymousRateLimitKey, durableRateLimit, requestTooLarge, sameOrigin } from "@/lib/security";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Student registration is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function inviteFor(token: string) {
  const admin = adminClient();
  const { data: tokenRecord } = await admin.from("assignment_invite_tokens").select("assignment_id, expires_at, revoked_at").eq("token_hash", hashOpaqueToken(token)).maybeSingle();
  if (!tokenRecord || tokenRecord.revoked_at || new Date(tokenRecord.expires_at) <= new Date()) return null;
  const { data, error } = await admin.from("assignments").select("id, active, closed_at, room:rooms!inner(id, title, story, status, theme, stage_count), room_version:room_versions!assignments_published_room_version_id_fkey(id, stage_count, stages:room_stages(id, ordinal, title, prompt, rule, token, item_type, accepted_answers, rubric, hints, items:room_stage_items(ordinal, prompt, accepted_answers)))").eq("id", tokenRecord.assignment_id).maybeSingle();
  const room = Array.isArray(data?.room) ? data.room[0] : data?.room;
  const version = Array.isArray(data?.room_version) ? data.room_version[0] : data?.room_version;
  if (error || !data || !data.active || data.closed_at || !room || room.status !== "published" || !version || version.stages?.length !== version.stage_count) return null;
  return { id: data.id as string, room: room as { id: string; title: string; story: string; status: string; theme: string; stage_count: number }, version };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  try {
    const invite = await inviteFor(inviteToken);
    if (!invite) return NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
    const session = await resolveStudentSession(request.cookies.get(studentSessionCookie)?.value);
    return NextResponse.json({ assignmentId: invite.id, room: { title: invite.room.title, story: invite.room.story, theme: invite.room.theme, stageCount: invite.room.stage_count }, version: invite.version, attempt: session?.assignmentId === invite.id ? session.attempt : null });
  } catch { return NextResponse.json({ error: "Invite service is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const rate = await durableRateLimit(await anonymousRateLimitKey(request, "enrolment"), 10, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many enrolment attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => null) as { fullName?: string; rollNumber?: string } | null;
  if (!body || !body.fullName || !body.rollNumber) return NextResponse.json({ error: "Full name and roll number are required." }, { status: 400 });
  const input = validateStudentRegistration({ fullName: body.fullName, rollNumber: body.rollNumber });
  if (!input.ok) return NextResponse.json({ errors: input.errors }, { status: 400 });
  try {
    const invite = await inviteFor(inviteToken);
    if (!invite) return NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.admin.createUser({ email: studentAuthEmail(input.value.username), password: input.value.password, email_confirm: true, user_metadata: { account_type: "student" } });
    if (userError || !userData.user) return NextResponse.json({ error: userError?.message ?? "Could not create the student account." }, { status: 400 });
    const studentId = userData.user.id;
    const { error: profileError } = await admin.from("student_profiles").insert({ id: studentId, full_name: input.value.fullName, roll_number: input.value.rollNumber, username: input.value.username });
    if (profileError) { await admin.auth.admin.deleteUser(studentId); return NextResponse.json({ error: profileError.message }, { status: 400 }); }
    const { data: enrolment, error: enrolmentError } = await admin.from("student_assignments").insert({ student_id: studentId, assignment_id: invite.id }).select("id").single();
    if (enrolmentError) { await admin.auth.admin.deleteUser(studentId); return NextResponse.json({ error: enrolmentError.message }, { status: 400 }); }
    const { error: attemptError } = await admin.from("mission_attempts").insert({ student_assignment_id: enrolment.id, room_version_id: invite.version.id });
    if (attemptError) return NextResponse.json({ error: attemptError.message }, { status: 400 });
    return NextResponse.json({ assignmentId: invite.id, enrolmentId: enrolment.id, authEmail: studentAuthEmail(input.value.username) }, { status: 201 });
  } catch { return NextResponse.json({ error: "Student registration is unavailable." }, { status: 503 }); }
}
