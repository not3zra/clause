import { describe, expect, it } from "vitest";
import { advanceMission, studentAuthEmail, validateStudentRegistration } from "./students";

describe("student invite-to-completion flow", () => {
  it("accepts email-free registration and persists a resumed, completed three-stage mission", () => {
    const registration = validateStudentRegistration({ fullName: "Aarav Mehta", rollNumber: "7B-04" });
    expect(registration.ok).toBe(true);
    if (registration.ok) {
      expect(registration.value.fullName).toBe("Aarav Mehta");
      expect(registration.value.rollNumber).toBe("7B-04");
      expect(registration.value.username).toMatch(/^student_/);
      expect(registration.value.password).toMatch(/^clause-/);
    }
    expect(studentAuthEmail("aarav_mehta")).toBe("student.aarav_mehta@accounts.clause.invalid");

    const started = advanceMission({ stage: 0, recoveredTokens: [], completedAt: null }, "CASE");
    const resumed = advanceMission(started, "FILE");
    expect(resumed).toEqual({ stage: 2, recoveredTokens: ["CASE", "FILE"], completedAt: null });
    expect(advanceMission(resumed, "OPEN")).toEqual({ stage: 3, recoveredTokens: ["CASE", "FILE", "OPEN"], completedAt: "complete" });
  });

  it("rejects missing student details", () => {
    expect(validateStudentRegistration({ fullName: "", rollNumber: "" })).toEqual({
      ok: false,
      errors: {
        fullName: "Enter your full name.", rollNumber: "Enter your roll number.",
      },
    });
  });
});
