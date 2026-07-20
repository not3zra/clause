import { describe, expect, it } from "vitest";
import { teacherSignUpOutcome } from "./teacher-auth";

describe("teacher sign-up outcome", () => {
  it("opens the teacher workspace only when Supabase returned a session", () => {
    expect(teacherSignUpOutcome({ userId: "teacher-1", hasSession: true })).toEqual({ kind: "signed-in", userId: "teacher-1" });
  });

  it("does not make unauthenticated RLS requests while email confirmation is pending", () => {
    expect(teacherSignUpOutcome({ userId: "teacher-1", hasSession: false })).toEqual({ kind: "confirmation-required", message: "Check your email to confirm your teacher account, then sign in." });
  });
});
