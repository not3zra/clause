export type StudentRegistration = { fullName: string; rollNumber: string; username: string; password: string };
type ValidRegistration = { ok: true; value: StudentRegistration };
type InvalidRegistration = { ok: false; errors: Partial<Record<keyof StudentRegistration, string>> };

export function validateStudentRegistration(input: StudentRegistration): ValidRegistration | InvalidRegistration {
  const value = { ...input, fullName: input.fullName.trim(), rollNumber: input.rollNumber.trim(), username: input.username.trim().toLowerCase() };
  const errors: InvalidRegistration["errors"] = {};
  if (!value.fullName) errors.fullName = "Enter the student's full name.";
  if (!value.rollNumber) errors.rollNumber = "Enter a roll number.";
  if (!/^[a-z0-9_]{3,30}$/.test(value.username)) errors.username = "Use 3–30 lowercase letters, numbers, or underscores.";
  if (value.password.length < 8) errors.password = "Use at least 8 characters for the password.";
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function studentAuthEmail(username: string) { return `student.${username}@accounts.clause.invalid`; }

export type MissionProgress = { stage: number; recoveredTokens: string[]; completedAt: string | null };
export function advanceMission(progress: MissionProgress, token: string): MissionProgress {
  if (progress.completedAt || progress.recoveredTokens.includes(token)) return progress;
  const recoveredTokens = [...progress.recoveredTokens, token];
  return { stage: recoveredTokens.length, recoveredTokens, completedAt: recoveredTokens.length === 3 ? "complete" : null };
}
