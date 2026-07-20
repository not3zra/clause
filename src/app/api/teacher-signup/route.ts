import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { anonymousRateLimitKey, durableRateLimit, requestTooLarge, sameOrigin, verifyTurnstile } from "@/lib/security";
import { teacherSignUpRequest } from "@/lib/teacher-signup-request";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request) || requestTooLarge(request)) return NextResponse.json({ error: "Invalid sign-up request." }, { status: 400 });
  const rate = await durableRateLimit(await anonymousRateLimitKey(request, "teacher-signup"), 5, 3600);
  if (!rate.allowed) return NextResponse.json({ error: "Too many sign-up attempts. Please try again later." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!await verifyTurnstile(body?.turnstileToken, request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null)) return NextResponse.json({ error: "Security verification failed. Please try again." }, { status: 403 });
  if (typeof body?.email !== "string" || typeof body?.password !== "string" || typeof body?.displayName !== "string" || !/^\S+@\S+\.\S+$/.test(body.email) || body.password.length < 8 || body.displayName.trim().length < 1 || body.displayName.length > 120) return NextResponse.json({ error: "Invalid sign-up request." }, { status: 400 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "Teacher sign-up is temporarily unavailable." }, { status: 503 });
  const auth = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await auth.auth.signUp(teacherSignUpRequest({ email: body.email.trim(), password: body.password, displayName: body.displayName.trim() }, request.nextUrl.origin));
  return error ? NextResponse.json({ error: "Could not create this teacher account." }, { status: 400 }) : NextResponse.json({ ok: true, confirmationRequired: !data.session }, { status: 201 });
}
