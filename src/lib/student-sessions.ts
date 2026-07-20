import { createHash, randomBytes } from "crypto";

export const studentSessionMaxAgeSeconds = 24 * 60 * 60;

export function createOpaqueToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOpaqueToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function validateStudentEnrolment(input: unknown) {
  const value = input as { fullName?: unknown; rollNumber?: unknown };
  const fullName = typeof value?.fullName === "string" ? value.fullName.trim() : "";
  const rollNumber = typeof value?.rollNumber === "string" ? value.rollNumber.trim() : "";
  const errors: Record<string, string> = {};
  if (!fullName || fullName.length > 120) errors.fullName = "Enter a name of up to 120 characters.";
  if (!rollNumber || rollNumber.length > 60) errors.rollNumber = "Enter a roll number of up to 60 characters.";
  return Object.keys(errors).length ? { ok: false as const, errors } : { ok: true as const, value: { fullName, rollNumber } };
}
