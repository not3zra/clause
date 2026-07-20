import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashOpaqueToken, studentSessionMaxAgeSeconds, validateStudentEnrolment } from "./student-sessions";

describe("student sessions", () => {
  it("creates high-entropy opaque tokens and stores only deterministic hashes", () => {
    const token = createOpaqueToken();
    expect(token).toHaveLength(43);
    expect(hashOpaqueToken(token)).toHaveLength(64);
    expect(hashOpaqueToken(token)).toBe(hashOpaqueToken(token));
    expect(studentSessionMaxAgeSeconds).toBe(86400);
  });
  it("accepts only the minimal enrolment fields", () => {
    expect(validateStudentEnrolment({ fullName: "Aarav Mehta", rollNumber: "7B-04" })).toEqual({ ok: true, value: { fullName: "Aarav Mehta", rollNumber: "7B-04" } });
    expect(validateStudentEnrolment({ fullName: "", rollNumber: "" })).toMatchObject({ ok: false, errors: { fullName: expect.any(String), rollNumber: expect.any(String) } });
  });
});
