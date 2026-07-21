import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import {
  groqOutputText,
  generationRepairInstruction,
  fallbackRoomGenerationResponse,
  groqFailedGenerationText,
  isRoomGenerationInput,
  parseGeneratedRoomDraft,
  providerResponseFormat,
  roomGenerationSystemInstruction,
} from "@/lib/room-generation";
import { groqConfiguration } from "../../../../../scripts/groq-config.mjs";
import { generationFailureCode, providerFailureCode, providerFailureDetails, shouldRetryProviderFailure } from "@/lib/generation-diagnostics";
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
    return NextResponse.json(fallbackRoomGenerationResponse(input));
  }
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
            content: roomGenerationSystemInstruction,
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
              repairInstructions: generationAttempt ? generationRepairInstruction(repairErrors, input.stageCount) : "",
            }),
          },
        ],
        text: {
          format: providerResponseFormat(),
        },
      }),
      signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const failedDraft = groqFailedGenerationText(data);
        if (response.status === 400 && failedDraft) {
          const result = parseGeneratedRoomDraft(failedDraft, input.stageCount, input.theme);
          if (result.ok) {
            await auditGeneration(teacherId, config.model, input.stageCount, "validated");
            return NextResponse.json({ draft: result.value, source: "ai", validation: "recovered" });
          }
          repairErrors = result.errors;
          if (generationAttempt === 0) continue;
          await auditGeneration(teacherId, config.model, input.stageCount, "rejected", repairErrors);
          return NextResponse.json({ error: "Generated draft needs revision.", errors: repairErrors, retryable: true }, { status: 422 });
        }
        const providerMessage = typeof (data as { error?: { message?: unknown } } | null)?.error?.message === "string"
          ? (data as { error: { message: string } }).error.message
          : undefined;
        const code = providerFailureCode(response.status, providerMessage);
        if (generationAttempt === 0 && shouldRetryProviderFailure(response.status, code)) continue;
        await auditGeneration(teacherId, config.model, input.stageCount, "unavailable", [code]);
        console.warn("room_generation_unavailable", JSON.stringify({ code, ...providerFailureDetails(data) }));
        if (response.status === 429) {
          return NextResponse.json(
            { error: "AI room generation is rate-limited. Please retry shortly.", retryable: true },
            { status: 429, headers: response.headers.get("retry-after") ? { "Retry-After": response.headers.get("retry-after")! } : undefined },
          );
        }
        return NextResponse.json(fallbackRoomGenerationResponse(input));
      }
      if (!data) {
        const code = generationFailureCode({ invalidResponse: true });
        await auditGeneration(teacherId, config.model, input.stageCount, "unavailable", [code]);
        console.warn("room_generation_unavailable", code);
        return NextResponse.json(fallbackRoomGenerationResponse(input));
      }
      const result = parseGeneratedRoomDraft(groqOutputText(data), input.stageCount, input.theme);
      if (result.ok) {
        await auditGeneration(teacherId, config.model, input.stageCount, "validated");
        return NextResponse.json({ draft: result.value, source: "ai", validation: generationAttempt ? "repaired" : "passed" });
      }
      repairErrors = result.errors;
    }
    await auditGeneration(teacherId, config.model, input.stageCount, "rejected", repairErrors);
    return NextResponse.json(fallbackRoomGenerationResponse(input));
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
    return NextResponse.json(fallbackRoomGenerationResponse(input));
  }
}
