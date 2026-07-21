export type StudentRegistration = { fullName: string; rollNumber: string; username: string; password: string };
type ValidRegistration = { ok: true; value: StudentRegistration };
type InvalidRegistration = { ok: false; errors: Partial<Record<string, string>> };

export function validateStudentRegistration(input: { fullName: string; rollNumber: string }): ValidRegistration | InvalidRegistration {
  const fullName = input.fullName.trim();
  const rollNumber = input.rollNumber.trim();
  const errors: Record<string, string> = {};
  if (!fullName) errors.fullName = "Enter your full name.";
  if (!rollNumber) errors.rollNumber = "Enter your roll number.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const username = `student_${rollNumber.replace(/[^a-z0-9]/gi, "_").toLowerCase().replace(/_+/g, "_").replace(/^_|_$/g, "")}`;
  const password = `clause-${rollNumber.replace(/[^a-z0-9]/gi, "")}`;
  return { ok: true, value: { fullName, rollNumber, username, password } };
}

export function studentAuthEmail(username: string) { return `student.${username}@accounts.clause.invalid`; }

export type MissionProgress = { stage: number; recoveredTokens: string[]; completedAt: string | null };
export function advanceMission(progress: MissionProgress, token: string): MissionProgress {
  if (progress.completedAt || progress.recoveredTokens.includes(token)) return progress;
  const recoveredTokens = [...progress.recoveredTokens, token];
  return { stage: recoveredTokens.length, recoveredTokens, completedAt: recoveredTokens.length === 3 ? "complete" : null };
}
