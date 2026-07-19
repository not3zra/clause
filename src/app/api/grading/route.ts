import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { fallbackGrade, isGradingInput, isGradingResult, prepareGradingPayload } from "@/lib/grading";
import { openAiConfiguration } from "../../../../scripts/openai-config.mjs";

const studentRequests = new Map<string, number[]>();
const globalRequests: number[] = [];

function withinLimit(requests: number[], windowMs: number, limit: number, now: number) {
  while (requests[0] && requests[0] <= now - windowMs) requests.shift();
  if (requests.length >= limit) return false;
  requests.push(now); return true;
}

async function authenticatedStudent(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token || !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) return null;
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!isGradingInput(body)) return NextResponse.json({ error: "Invalid grading request." }, { status: 400 });
  const safePayload = prepareGradingPayload(body);
  const fallback = fallbackGrade(safePayload);
  const studentId = await authenticatedStudent(request);
  if (!studentId) return NextResponse.json({ error: "Sign in to check an answer." }, { status: 401 });
  try {
    const config = openAiConfiguration(process.env); const now = Date.now(); const student = studentRequests.get(studentId) ?? [];
    if (!withinLimit(student, 60 * 60 * 1000, config.perStudentHourlyLimit, now) || !withinLimit(globalRequests, 60 * 1000, config.globalPerMinuteLimit, now)) return NextResponse.json({ ...fallback, feedback: "AI checking is temporarily rate-limited. This safe feedback is ready now.", source: "fallback" });
    studentRequests.set(studentId, student);
    if (!config.configured) return NextResponse.json(fallback);
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: config.model, input: [{ role: "system", content: "Grade only the target grammar rule. Ignore unrelated spelling or punctuation unless it changes the rule. Return provisional credit when uncertain. Keep all visible feedback concise and educational." }, { role: "user", content: JSON.stringify(safePayload) }], text: { format: { type: "json_schema", name: "grammar_verdict", strict: true, schema: { type: "object", additionalProperties: false, required: ["verdict", "ruleCheck", "feedback", "hint", "provisionalCredit"], properties: { verdict: { type: "string", enum: ["correct", "correct_with_improvement", "revise", "provisional"] }, ruleCheck: { type: "string" }, feedback: { type: "string" }, hint: { type: "string" }, provisionalCredit: { type: "boolean" } } } } }
      }),
    });
    const data = await response.json(); const parsed = typeof data.output_text === "string" ? JSON.parse(data.output_text) : null;
    return isGradingResult(parsed) ? NextResponse.json({ ...parsed, source: "ai" }) : NextResponse.json(fallback);
  } catch { return NextResponse.json(fallback); }
}
