import { NextRequest, NextResponse } from "next/server";
import { hashOpaqueToken } from "@/lib/student-sessions";
import { resolveStudentSession, studentSessionAdmin, studentSessionCookie } from "@/lib/student-session-server";
import { durableRateLimit, requestTooLarge, sameOrigin } from "@/lib/security";

export async function GET(request: NextRequest) {
  const session = await resolveStudentSession(request.cookies.get(studentSessionCookie)?.value);
  if (!session) return NextResponse.json({ error: "Student session expired." }, { status: 401 });
  const { data: appeals } = await studentSessionAdmin().from("appeals").select("id, stage_id, status, created_at").eq("mission_attempt_id", session.attempt.id).order("created_at", { ascending: false });
  return NextResponse.json({ attempt: session.attempt, appeals: appeals ?? [] });
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const token = request.cookies.get(studentSessionCookie)?.value;
  const session = await resolveStudentSession(token);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!session || !token) return NextResponse.json({ error: "Student session expired." }, { status: 401 });
  const rate = await durableRateLimit(`mission:${session.attempt.id}`, 90, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  if (body?.action === "appeal") {
    if (typeof body.stageId !== "string" || typeof body.explanation !== "string" || body.explanation.length > 1000) return NextResponse.json({ error: "Invalid appeal." }, { status: 400 });
    const { error } = await studentSessionAdmin().from("appeals").insert({ mission_attempt_id: session.attempt.id, stage_id: body.stageId, item_attempt_id: typeof body.itemAttemptId === "string" ? body.itemAttemptId : null, student_explanation: body.explanation.trim() });
    return error ? NextResponse.json({ error: "Could not submit the appeal." }, { status: 400 }) : NextResponse.json({ ok: true }, { status: 201 });
  }
  if (!body || typeof body.stageId !== "string" || typeof body.verdict !== "string" || typeof body.source !== "string" || typeof body.idempotencyKey !== "string") return NextResponse.json({ error: "Invalid mission submission." }, { status: 400 });
  const { data, error } = await studentSessionAdmin().rpc("submit_session_mission_item", {
    p_session_hash: hashOpaqueToken(token), p_attempt_id: session.attempt.id, p_stage_id: body.stageId,
    p_answer: body.answer ?? {}, p_verdict: body.verdict, p_recommendation: body.recommendation ?? {}, p_source: body.source,
    p_provisional_credit: body.provisionalCredit === true, p_credit_awarded: body.creditAwarded === true,
    p_hint_used: body.hintUsed === true, p_idempotency_key: body.idempotencyKey,
  });
  return error ? NextResponse.json({ error: "Could not save this answer." }, { status: 400 }) : NextResponse.json({ itemAttempt: data });
}
