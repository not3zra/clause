import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { fallbackGrade, isGradingInput, isGradingResult, prepareGradingPayload } from "@/lib/grading";
import { geminiOutputText } from "@/lib/room-generation";
import { geminiConfiguration } from "../../../../scripts/gemini-config.mjs";
import { resolveStudentSession, studentSessionCookie } from "@/lib/student-session-server";
import { durableRateLimit, requestTooLarge, sameOrigin } from "@/lib/security";

async function authenticatedStudent(request: NextRequest) {
  const cookieSession = await resolveStudentSession(request.cookies.get(studentSessionCookie)?.value);
  if (cookieSession) return cookieSession.studentAssignmentId;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid grading request." }, { status: 400 });
  const body = await request.json().catch(() => null);
  if (!isGradingInput(body)) return NextResponse.json({ error: "Invalid grading request." }, { status: 400 });
  const safePayload = prepareGradingPayload(body);
  const fallback = fallbackGrade(safePayload);
  const studentId = await authenticatedStudent(request);
  if (!studentId) return NextResponse.json({ error: "Sign in to check an answer." }, { status: 401 });
  try {
    const config = geminiConfiguration(process.env);
    const rate = await durableRateLimit(`grading:${studentId}`, config.perStudentHourlyLimit, 3600);
    if (!rate.allowed) return NextResponse.json({ ...fallback, feedback: "AI checking is temporarily rate-limited. This safe feedback is ready now.", source: "fallback" }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
    if (!config.configured) return NextResponse.json(fallback);
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY!)}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: "Grade only the target grammar rule. Ignore unrelated spelling or punctuation unless it changes the rule. Return provisional credit when uncertain. Keep all visible feedback concise and educational." }] }, contents: [{ role: "user", parts: [{ text: JSON.stringify(safePayload) }] }], generationConfig: { responseMimeType: "application/json", responseJsonSchema: { type: "object", additionalProperties: false, required: ["verdict", "ruleCheck", "feedback", "hint", "provisionalCredit"], properties: { verdict: { type: "string", enum: ["correct", "correct_with_improvement", "revise", "provisional"] }, ruleCheck: { type: "string" }, feedback: { type: "string" }, hint: { type: "string" }, provisionalCredit: { type: "boolean" } } } } }),
    });
    const data = await response.json();
    if (!response.ok) return NextResponse.json(fallback);
    const outputText = geminiOutputText(data);
    const parsed = typeof outputText === "string" ? JSON.parse(outputText) : null;
    return isGradingResult(parsed) ? NextResponse.json({ ...parsed, source: "ai" }) : NextResponse.json(fallback);
  } catch { return NextResponse.json(fallback); }
}
