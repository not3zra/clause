export type TeacherSignUpOutcome =
  | { kind: "signed-in"; userId: string }
  | { kind: "confirmation-required"; message: string };

export function teacherSignUpOutcome({ userId, hasSession }: { userId: string | null | undefined; hasSession: boolean }): TeacherSignUpOutcome {
  if (userId && hasSession) return { kind: "signed-in", userId };
  return { kind: "confirmation-required", message: "Check your email to confirm your teacher account, then sign in." };
}
