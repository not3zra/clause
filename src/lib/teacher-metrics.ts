export type Mastery = "Secure" | "Developing" | "Needs Practice";

type StageResult = { attempts?: number; correct?: boolean; guided?: boolean; verdict?: string };
type Attempt = { currentStage: number; completed: boolean; hintsUsed: number; stageResults: Record<string, StageResult> };

export type ItemAttempt = {
  stageId: string;
  rule: string;
  answer: string;
  feedback: string;
  verdict: string;
  creditAwarded: boolean;
  provisionalCredit: boolean;
  hintUsed: boolean;
  submittedAt: string;
};

export type AnalyticsAttempt = {
  id: string;
  classId?: string;
  roomId?: string;
  studentName: string;
  rollNumber: string;
  currentStage: number;
  stageCount: number;
  completed: boolean;
  hintsUsed: number;
  elapsedSeconds: number;
  score: number;
  provisionalScore: number;
  itemAttempts: ItemAttempt[];
  appeals: number;
};

type Scope = { classId?: string; roomId?: string };

export function masteryLabel({ firstAttemptAccuracy, guided, provisional }: { firstAttemptAccuracy: number; guided: boolean; provisional: boolean }): Mastery {
  if (provisional) return "Developing";
  if (guided || firstAttemptAccuracy < 50) return "Needs Practice";
  if (firstAttemptAccuracy >= 80) return "Secure";
  return "Developing";
}

export function summarizeAttempts(attempts: Attempt[]) {
  const completed = attempts.filter((attempt) => attempt.completed).length;
  const results = attempts.flatMap((attempt) => Object.values(attempt.stageResults));
  const firstAttemptAccuracy = results.length ? Math.round((results.filter((result) => result.correct && result.attempts === 1).length / results.length) * 100) : 0;
  const hintsUsed = attempts.reduce((total, attempt) => total + attempt.hintsUsed, 0);
  const guided = results.some((result) => result.guided);
  const provisional = results.some((result) => result.verdict === "provisional");
  return { completion: attempts.length ? Math.round((completed / attempts.length) * 100) : 0, firstAttemptAccuracy, hintsUsed, mastery: masteryLabel({ firstAttemptAccuracy, guided, provisional }) };
}

function firstAttempts(items: ItemAttempt[]) {
  const firstByStage = new Map<string, ItemAttempt>();
  for (const item of items) if (!firstByStage.has(item.stageId)) firstByStage.set(item.stageId, item);
  return [...firstByStage.values()];
}

function firstAttemptAccuracy(items: ItemAttempt[]) {
  const first = firstAttempts(items);
  return first.length ? Math.round((first.filter((item) => item.creditAwarded).length / first.length) * 100) : 0;
}

function isInScope(attempt: AnalyticsAttempt, scope: Scope) {
  return (!scope.classId || attempt.classId === scope.classId) && (!scope.roomId || attempt.roomId === scope.roomId);
}

export function buildAnalytics(attempts: AnalyticsAttempt[], scope: Scope = {}) {
  const scoped = attempts.filter((attempt) => isInScope(attempt, scope));
  const items = scoped.flatMap((attempt) => attempt.itemAttempts);
  const students = scoped.map((attempt) => {
    const accuracy = firstAttemptAccuracy(attempt.itemAttempts);
    const provisional = attempt.provisionalScore > 0 || attempt.itemAttempts.some((item) => item.provisionalCredit);
    const guided = attempt.itemAttempts.some((item) => item.verdict === "guided");
    return { ...attempt, name: attempt.studentName, firstAttemptAccuracy: accuracy, mastery: masteryLabel({ firstAttemptAccuracy: accuracy, guided, provisional }) };
  });
  const ruleItems = new Map<string, ItemAttempt[]>();
  for (const item of items) ruleItems.set(item.rule || "Unspecified rule", [...(ruleItems.get(item.rule || "Unspecified rule") ?? []), item]);
  const rules = [...ruleItems.entries()].map(([rule, entries]) => {
    const accuracy = firstAttemptAccuracy(entries);
    return { rule, firstAttemptAccuracy: accuracy, mastery: masteryLabel({ firstAttemptAccuracy: accuracy, guided: entries.some((item) => item.verdict === "guided"), provisional: entries.some((item) => item.provisionalCredit) }), itemCount: entries.length };
  });
  return {
    summary: {
      completion: scoped.length ? Math.round((scoped.filter((attempt) => attempt.completed).length / scoped.length) * 100) : 0,
      firstAttemptAccuracy: firstAttemptAccuracy(items),
      hintsUsed: scoped.reduce((total, attempt) => total + attempt.hintsUsed, 0),
      activeAttempts: scoped.filter((attempt) => !attempt.completed).length,
      elapsedSeconds: scoped.reduce((total, attempt) => total + attempt.elapsedSeconds, 0),
      appeals: scoped.reduce((total, attempt) => total + attempt.appeals, 0),
    }, students, rules,
  };
}

function csvCell(value: unknown) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toAnalyticsCsv(analytics: ReturnType<typeof buildAnalytics>) {
  const header = ["Student", "Roll number", "Progress", "Completion", "Score", "First-attempt accuracy", "Hints", "Elapsed seconds", "Mastery", "Appeals", "Rule", "Original answer", "Grading feedback", "Verdict", "Provisional", "Submitted at"];
  const rows = analytics.students.flatMap((student) => {
    const base = [student.studentName, student.rollNumber, `${student.currentStage}/${student.stageCount}`, student.completed ? "Complete" : "In progress", student.score, student.firstAttemptAccuracy, student.hintsUsed, student.elapsedSeconds, student.mastery, student.appeals];
    return student.itemAttempts.length ? student.itemAttempts.map((item) => [...base, item.rule, item.answer, item.feedback, item.verdict, item.provisionalCredit ? "Yes" : "No", item.submittedAt]) : [[...base, "", "", "", "", "", ""]];
  });
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
