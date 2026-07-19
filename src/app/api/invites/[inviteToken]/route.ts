import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { studentAuthEmail, validateStudentRegistration } from "@/lib/students";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Student registration is not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function inviteFor(token: string) {
  const { data, error } = await adminClient().from("assignments").select("id, active, room:rooms!inner(id, title, status, theme, stage_count), room_version:room_versions!assignments_published_room_version_id_fkey(id, stage_count, stages:room_stages(id, ordinal, title, prompt, rule, token, item_type, accepted_answers, rubric, hints, items:room_stage_items(ordinal, prompt, accepted_answers)))").eq("invite_token", token).maybeSingle();
  const room = Array.isArray(data?.room) ? data.room[0] : data?.room;
  const version = Array.isArray(data?.room_version) ? data.room_version[0] : data?.room_version;
  if (error || !data || !data.active || !room || room.status !== "published" || !version || version.stages?.length !== version.stage_count) return null;
  return { id: data.id as string, room: room as { id: string; title: string; status: string; theme: string; stage_count: number }, version };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  try {
    const invite = await inviteFor(inviteToken);
    return invite ? NextResponse.json({ assignmentId: invite.id, room: { title: invite.room.title, theme: invite.room.theme, stageCount: invite.room.stage_count }, version: invite.version }) : NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
  } catch { return NextResponse.json({ error: "Invite service is unavailable." }, { status: 503 }); }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ inviteToken: string }> }) {
  const { inviteToken } = await params;
  const input = validateStudentRegistration(await request.json());
  if (!input.ok) return NextResponse.json({ errors: input.errors }, { status: 400 });
  try {
    const invite = await inviteFor(inviteToken);
    if (!invite) return NextResponse.json({ error: "This invite is unavailable." }, { status: 404 });
    const admin = adminClient();
    const { data: existing } = await admin.from("student_profiles").select("id").eq("username", input.value.username).maybeSingle();
    if (existing) return NextResponse.json({ errors: { username: "That username is already in use." } }, { status: 409 });
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
