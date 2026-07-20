import { NextRequest, NextResponse } from "next/server";
import { healthStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") ?? crypto.randomUUID();
  return NextResponse.json(healthStatus(requestId), { headers: { "Cache-Control": "no-store", "X-Request-Id": requestId } });
}
