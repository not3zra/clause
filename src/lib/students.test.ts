import { describe, expect, it } from "vitest";
import { advanceMission, studentAuthEmail, validateStudentRegistration } from "./students";

describe("student invite-to-completion flow", () => {
  it("accepts email-free registration and persists a resumed, completed three-stage mission", () => {
    const registration = validateStudentRegistration({ fullName: "Aarav Mehta", rollNumber: "7B-04", username: "aarav_mehta", password: "safe-pass-123" });
    expect(registration).toEqual({ ok: true, value: { fullName: "Aarav Mehta", rollNumber: "7B-04", username: "aarav_mehta", password: "safe-pass-123" } });
    expect(studentAuthEmail("aarav_mehta")).toBe("student.aarav_mehta@accounts.clause.invalid");

    const started = advanceMission({ stage: 0, recoveredTokens: [], completedAt: null }, "CASE");
    const resumed = advanceMission(started, "FILE");
    expect(resumed).toEqual({ stage: 2, recoveredTokens: ["CASE", "FILE"], completedAt: null });
    expect(advanceMission(resumed, "OPEN")).toEqual({ stage: 3, recoveredTokens: ["CASE", "FILE", "OPEN"], completedAt: "complete" });
  });

  it("rejects missing student details and usernames that cannot safely map to an internal auth identity", () => {
    expect(validateStudentRegistration({ fullName: "", rollNumber: "", username: "bad name", password: "short" })).toEqual({
      ok: false,
      errors: {
        fullName: "Enter the student's full name.", rollNumber: "Enter a roll number.", username: "Use 3–30 lowercase letters, numbers, or underscores.", password: "Use at least 8 characters for the password.",
      },
    });
  });
});
