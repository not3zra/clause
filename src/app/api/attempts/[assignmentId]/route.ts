import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { canAttachPublishedVersion } from "../../../../lib/attempt-version";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function authenticatedStudentId(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

function adminClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) throw new Error("Student attempt retrieval is not configured.");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  if (!uuid.test(assignmentId)) return NextResponse.json({ error: "Invalid mission request." }, { status: 400 });
  const studentId = await authenticatedStudentId(request);
  if (!studentId) return NextResponse.json({ error: "Sign in to continue your mission." }, { status: 401 });
  try {
    const admin = adminClient();
    const { data: enrolment } = await admin
      .from("student_assignments")
      .select("id, assignment:assignments!inner(published_room_version_id)")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!enrolment) return NextResponse.json({ error: "Mission attempt not found." }, { status: 404 });
    const { data: loadedAttempt } = await admin
      .from("mission_attempts")
      .select("id, room_version_id, current_stage, recovered_tokens, completed_at, hints_used, stage_results, score, provisional_score, elapsed_seconds")
      .eq("student_assignment_id", enrolment.id)
      .maybeSingle();
    if (!loadedAttempt) return NextResponse.json({ error: "Mission attempt not found." }, { status: 404 });
    const assignment = Array.isArray(enrolment.assignment) ? enrolment.assignment[0] : enrolment.assignment;
    const publishedVersionId = assignment?.published_room_version_id;
    let attempt = loadedAttempt;
    if (publishedVersionId && canAttachPublishedVersion({
      roomVersionId: attempt.room_version_id ?? null,
      currentStage: attempt.current_stage,
      recoveredTokens: attempt.recovered_tokens ?? [],
      completedAt: attempt.completed_at ?? null,
    })) {
      const { data: repairedAttempt, error: repairError } = await admin
        .from("mission_attempts")
        .update({ room_version_id: publishedVersionId })
        .eq("id", attempt.id)
        .is("room_version_id", null)
        .select("id, room_version_id, current_stage, recovered_tokens, completed_at, hints_used, stage_results, score, provisional_score, elapsed_seconds")
        .maybeSingle();
      if (repairError || !repairedAttempt) return NextResponse.json({ error: "Mission attempt could not be prepared." }, { status: 409 });
      attempt = repairedAttempt;
    }
    return NextResponse.json(attempt);
  } catch {
    return NextResponse.json({ error: "Mission retrieval is temporarily unavailable." }, { status: 503 });
  }
}
