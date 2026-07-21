import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

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
      .select("id")
      .eq("assignment_id", assignmentId)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!enrolment) return NextResponse.json({ error: "Mission attempt not found." }, { status: 404 });
    const { data: attempt } = await admin
      .from("mission_attempts")
      .select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results, score, elapsed_seconds")
      .eq("student_assignment_id", enrolment.id)
      .maybeSingle();
    if (!attempt) return NextResponse.json({ error: "Mission attempt not found." }, { status: 404 });
    return NextResponse.json(attempt);
  } catch {
    return NextResponse.json({ error: "Mission retrieval is temporarily unavailable." }, { status: 503 });
  }
}
