import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { teacherSignUpOutcome } from "./teacher-auth";

describe("teacher sign-up outcome", () => {
  it("opens the teacher workspace only when Supabase returned a session", () => {
    expect(teacherSignUpOutcome({ userId: "teacher-1", hasSession: true })).toEqual({ kind: "signed-in", userId: "teacher-1" });
  });

  it("does not make unauthenticated RLS requests while email confirmation is pending", () => {
    expect(teacherSignUpOutcome({ userId: "teacher-1", hasSession: false })).toEqual({ kind: "confirmation-required", message: "Check your email to confirm your teacher account, then sign in." });
  });

  it("ships authenticated grants for the tables protected by teacher RLS", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607200001_teacher_table_grants.sql"), "utf8");
    expect(migration).toContain("grant select, update on public.teacher_profiles to authenticated;");
    expect(migration).toContain("grant select, insert, update, delete on public.classes to authenticated;");
  });
});
