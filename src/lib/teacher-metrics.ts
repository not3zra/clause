type StageResult = { attempts?: number; correct?: boolean; guided?: boolean; verdict?: string };
type Attempt = { currentStage: number; completed: boolean; hintsUsed: number; stageResults: Record<string, StageResult> };

export function masteryLabel({ firstAttemptAccuracy, guided, provisional }: { firstAttemptAccuracy: number; guided: boolean; provisional: boolean }) {
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
