import { NextResponse } from "next/server";
import { studentSessionCookie } from "@/lib/student-session-server";

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(studentSessionCookie, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
