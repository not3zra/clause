import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createOpaqueToken, hashOpaqueToken, studentSessionMaxAgeSeconds, validateStudentEnrolment } from "@/lib/student-sessions";
import { resolveStudentSession, studentSessionCookie } from "@/lib/student-session-server";
import { anonymousRateLimitKey, durableRateLimit, requestTooLarge, sameOrigin, verifyTurnstile } from "@/lib/security";

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
  const { data, error } = await admin.from("assignments").select("id, active, closed_at, room:rooms!inner(id, title, status, theme, stage_count), room_version:room_versions!assignments_published_room_version_id_fkey(id, stage_count, stages:room_stages(id, ordinal, title, prompt, rule, token, item_type, accepted_answers, rubric, hints, items:room_stage_items(ordinal, prompt, accepted_answers)))").eq("id", tokenRecord.assignment_id).maybeSingle();
  const room = Array.isArray(data?.room) ? data.room[0] : data?.room;
  const version = Array.isArray(data?.room_version) ? data.room_version[0] : data?.room_version;
  if (error || !data || !data.active || data.closed_at || !room || room.status !== "published" || !version || version.stages?.length !== version.stage_count) return null;
  return { id: data.id as string, room: room as { id: string; title: string; status: string; theme: string; stage_count: number }, version };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  try {
    const invite = await inviteFor(inviteToken);
    if (!invite) return NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
    const session = await resolveStudentSession(request.cookies.get(studentSessionCookie)?.value);
    return NextResponse.json({ assignmentId: invite.id, room: { title: invite.room.title, theme: invite.room.theme, stageCount: invite.room.stage_count }, version: invite.version, attempt: session?.assignmentId === invite.id ? session.attempt : null });
  } catch { return NextResponse.json({ error: "Invite service is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const rate = await durableRateLimit(await anonymousRateLimitKey(request, "enrolment"), 10, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many enrolment attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!await verifyTurnstile(body?.turnstileToken, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)) return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 403 });
  const input = validateStudentEnrolment(body);
  if (!input.ok) return NextResponse.json({ errors: input.errors }, { status: 400 });
  try {
    const invite = await inviteFor(inviteToken);
    if (!invite) return NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
    const admin = adminClient();
    const opaqueToken = createOpaqueToken();
    const expiresAt = new Date(Date.now() + studentSessionMaxAgeSeconds * 1000).toISOString();
    const internalEmail = `session.${crypto.randomUUID()}@accounts.clause.invalid`;
    const { data: userData, error: userError } = await admin.auth.admin.createUser({ email: internalEmail, email_confirm: true, user_metadata: { account_type: "student", passwordless_session: true } });
    if (userError || !userData.user) return NextResponse.json({ error: "Could not create the student account." }, { status: 400 });
    const { data: enrolment, error: enrolmentError } = await admin.rpc("enrol_student_with_session", { p_assignment_id: invite.id, p_student_id: userData.user.id, p_full_name: input.value.fullName, p_roll_number: input.value.rollNumber, p_session_hash: hashOpaqueToken(opaqueToken), p_expires_at: expiresAt }).single();
    if (enrolmentError) { await admin.auth.admin.deleteUser(userData.user.id); return NextResponse.json({ error: "Could not create the student account." }, { status: 400 }); }
    const response = NextResponse.json({ assignmentId: invite.id, enrolmentId: (enrolment as { student_assignment_id: string }).student_assignment_id }, { status: 201 });
    response.cookies.set(studentSessionCookie, opaqueToken, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: studentSessionMaxAgeSeconds });
    return response;
  } catch { return NextResponse.json({ error: "Student registration is unavailable." }, { status: 503 }); }
}
