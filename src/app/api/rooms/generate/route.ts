import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  groqOutputText,
  generationRepairInstruction,
  isRoomGenerationInput,
  parseGeneratedRoomDraft,
} from "@/lib/room-generation";
import { groqConfiguration } from "../../../../../scripts/groq-config.mjs";
import { generationFailureCode, providerFailureCode } from "@/lib/generation-diagnostics";
import { durableRateLimit, requestTooLarge, sameOrigin } from "@/lib/security";

async function authenticatedTeacher(request: NextRequest) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (
    !token ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
    return null;
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data } = await client.auth.getUser(token);
  return data.user?.id ?? null;
}

async function auditGeneration(
  teacherId: string,
  model: string,
  stageCount: number,
  outcome: "validated" | "rejected" | "unavailable",
  errors: string[] = [],
) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY)
    return;
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  try {
    await admin
      .from("room_generation_audits")
      .insert({
        teacher_id: teacherId,
        model,
        stage_count: stageCount,
        outcome,
        validation_errors: errors,
      });
  } catch {
    /* audit must not block a safe retry */
  }
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid room generation request." }, { status: 400 });
  const input = await request.json().catch(() => null);
  if (!isRoomGenerationInput(input))
    return NextResponse.json(
      { error: "Invalid room generation request." },
      { status: 400 },
    );
  const teacherId = await authenticatedTeacher(request);
  if (!teacherId)
    return NextResponse.json(
      { error: "Sign in as a teacher to generate a room." },
      { status: 401 },
    );
  const config = groqConfiguration(process.env);
  const rate = await durableRateLimit(`generation:${teacherId}`, config.perTeacherGenerationHourlyLimit, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many generation requests. Please retry later.", retryable: true }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  if (!config.configured) {
    const code = generationFailureCode({ configured: false });
    await auditGeneration(
      teacherId,
      config.model,
      input.stageCount,
      "unavailable",
      [code],
    );
    console.warn("room_generation_unavailable", code);
    return NextResponse.json(
      {
        error:
          "AI room generation is temporarily unavailable. Try again shortly.",
      },
      { status: 503 },
    );
  }
  const stageSchema = {
    type: "object",
    additionalProperties: false,
    required: [
      "ordinal",
      "title",
      "prompt",
      "rule",
      "token",
      "itemType",
      "acceptedAnswers",
      "rubric",
      "hints",
      "items",
    ],
    properties: {
      ordinal: { type: "integer", minimum: 1 },
      title: { type: "string", minLength: 1 },
      prompt: { type: "string", minLength: 1 },
      rule: { type: "string", minLength: 1 },
      token: { type: "string", minLength: 1, maxLength: 32 },
      itemType: { type: "string", enum: ["deterministic", "free_text"] },
      acceptedAnswers: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      rubric: { type: "string", minLength: 1 },
      hints: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "acceptedAnswers"],
          properties: {
            prompt: { type: "string", minLength: 1 },
            acceptedAnswers: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
  };
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "story", "grade", "difficulty", "stages"],
    properties: {
      title: { type: "string", minLength: 1 },
      story: { type: "string", minLength: 1 },
      grade: { type: "integer" },
      difficulty: {
        type: "string",
        enum: ["supported", "standard", "stretch"],
      },
      stages: {
        type: "array",
        minItems: input.stageCount,
        maxItems: input.stageCount,
        items: stageSchema,
      },
    },
  };
  let timedOut = false;
  try {
    let repairErrors: string[] = [];
    for (let generationAttempt = 0; generationAttempt < 2; generationAttempt += 1) {
      const controller = new AbortController();
      timedOut = false;
      const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 25_000);
      const response = await fetch("https://api.groq.com/openai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        input: [
          {
            role: "system",
            content:
              "Create a kid-safe grammar escape-room draft. Return only the requested JSON. Do not include personal data, violence, threats, stereotypes, or unsafe content. Make the supplied theme the actual setting: its story and every stage must use distinct setting-specific people, places, objects, clues, and a final mystery. For Detective Office, use a non-violent case with detectives, evidence, suspects or witnesses, and clues. Do not reuse the sample CASE/FILE/OPEN/SEAL storyline. Match the exercise to its itemType exactly: deterministic stages are sentence classifications with 3-5 items and each item answer is exactly Agrees or Needs revision; free_text stages ask for a specific grammar repair or construction, have no items, and list accepted corrected wording. Verify every answer key against the stated grammar rule before returning it.",
          },
          {
            role: "user",
            content: JSON.stringify({
              grade: input.grade,
              topic: input.topic.trim(),
              subtopic: input.subtopic.trim(),
              theme: input.theme.trim(),
              stageCount: input.stageCount,
              instructions: input.instructions?.trim() ?? "",
              repairInstructions: generationAttempt ? generationRepairInstruction(repairErrors) : "",
            }),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "room_draft",
            strict: true,
            schema,
          },
        },
      }),
      signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const providerMessage = typeof (data as { error?: { message?: unknown } } | null)?.error?.message === "string"
          ? (data as { error: { message: string } }).error.message
          : undefined;
        const code = providerFailureCode(response.status, providerMessage);
        await auditGeneration(teacherId, config.model, input.stageCount, "unavailable", [code]);
        console.warn("room_generation_unavailable", code);
        const status = response.status === 429 ? 429 : 503;
        const message = response.status === 429 ? "AI room generation is rate-limited. Please retry shortly." : "AI room generation is temporarily unavailable. Try again shortly.";
        return NextResponse.json({ error: message, retryable: true }, { status, headers: response.headers.get("retry-after") ? { "Retry-After": response.headers.get("retry-after")! } : undefined });
      }
      if (!data) {
        const code = generationFailureCode({ invalidResponse: true });
        await auditGeneration(teacherId, config.model, input.stageCount, "unavailable", [code]);
        console.warn("room_generation_unavailable", code);
        return NextResponse.json({ error: "AI room generation is temporarily unavailable. Try again shortly.", retryable: true }, { status: 503 });
      }
      const result = parseGeneratedRoomDraft(groqOutputText(data), input.stageCount, input.theme);
      if (result.ok) {
        await auditGeneration(teacherId, config.model, input.stageCount, "validated");
        return NextResponse.json({ draft: result.value, source: "ai", validation: generationAttempt ? "repaired" : "passed" });
      }
      repairErrors = result.errors;
    }
    await auditGeneration(teacherId, config.model, input.stageCount, "rejected", repairErrors);
    return NextResponse.json(
      {
        error: "Generated draft needs revision.",
        errors: repairErrors,
        retryable: true,
      },
      { status: 422 },
    );
  } catch {
    const code = generationFailureCode({ timedOut });
    await auditGeneration(
      teacherId,
      config.model,
      input.stageCount,
      "unavailable",
      [code],
    );
    console.warn("room_generation_unavailable", code);
    return NextResponse.json(
      {
        error:
          "AI room generation is temporarily unavailable. Try again shortly.",
        retryable: true,
      },
      { status: 503 },
    );
  }
}
