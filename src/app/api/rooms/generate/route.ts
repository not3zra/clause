import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  groqOutputText,
  isRoomGenerationInput,
  parseGeneratedRoomDraft,
} from "@/lib/room-generation";
import { groqConfiguration } from "../../../../../scripts/groq-config.mjs";

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
  if (!config.configured) {
    await auditGeneration(
      teacherId,
      config.model,
      input.stageCount,
      "unavailable",
    );
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
      ordinal: { type: "integer" },
      title: { type: "string" },
      prompt: { type: "string" },
      rule: { type: "string" },
      token: { type: "string" },
      itemType: { type: "string", enum: ["deterministic", "free_text"] },
      acceptedAnswers: { type: "array", items: { type: "string" } },
      rubric: { type: "string" },
      hints: { type: "array", items: { type: "string" } },
      items: { type: "array" },
    },
  };
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["title", "story", "grade", "difficulty", "stages"],
    properties: {
      title: { type: "string" },
      story: { type: "string" },
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
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25_000);
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
              "Create a kid-safe grammar escape-room draft. Return only the requested JSON. Do not include personal data, violence, threats, stereotypes, or unsafe content.",
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
    const data = await response.json();
    if (!response.ok) {
      await auditGeneration(
        teacherId,
        config.model,
        input.stageCount,
        "unavailable",
      );
      const status = response.status === 429 ? 429 : 503;
      const message =
        response.status === 429
          ? "AI room generation is rate-limited. Please retry shortly."
          : "AI room generation is temporarily unavailable. Try again shortly.";
      return NextResponse.json(
        { error: message, retryable: true },
        {
          status,
          headers: response.headers.get("retry-after")
            ? { "Retry-After": response.headers.get("retry-after")! }
            : undefined,
        },
      );
    }
    const output = groqOutputText(data);
    const result = parseGeneratedRoomDraft(output, input.stageCount);
    if (result.ok) {
      await auditGeneration(
        teacherId,
        config.model,
        input.stageCount,
        "validated",
      );
      return NextResponse.json({
        draft: result.value,
        source: "ai",
        validation: "passed",
      });
    }
    await auditGeneration(
      teacherId,
      config.model,
      input.stageCount,
      "rejected",
      result.errors,
    );
    return NextResponse.json(
      {
        error: "Generated draft needs revision.",
        errors: result.errors,
        retryable: true,
      },
      { status: 422 },
    );
  } catch {
    await auditGeneration(
      teacherId,
      config.model,
      input.stageCount,
      "unavailable",
    );
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
