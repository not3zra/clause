import { createClient } from "@supabase/supabase-js";
import { hashOpaqueToken } from "./student-sessions";

export const studentSessionCookie = "clause_student_session";

export function studentSessionAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Student sessions are not configured.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function resolveStudentSession(token: string | undefined) {
  if (!token) return null;
  const client = studentSessionAdmin();
  const { data: session } = await client
    .from("student_sessions")
    .select("id, student_assignment_id, expires_at, revoked_at")
    .eq("token_hash", hashOpaqueToken(token))
    .maybeSingle();
  if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) return null;
  await client.from("student_sessions").update({ last_seen_at: new Date().toISOString() }).eq("id", session.id);
  const { data: enrolment } = await client
    .from("student_assignments")
    .select("assignment_id")
    .eq("id", session.student_assignment_id)
    .maybeSingle();
  const { data: attempt } = await client
    .from("mission_attempts")
    .select("id, current_stage, recovered_tokens, completed_at, hints_used, stage_results, room_version_id, score, elapsed_seconds")
    .eq("student_assignment_id", session.student_assignment_id)
    .maybeSingle();
  return attempt && enrolment ? { assignmentId: enrolment.assignment_id, studentAssignmentId: session.student_assignment_id, attempt } : null;
}
