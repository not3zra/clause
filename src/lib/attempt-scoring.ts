export function scoreAttempt({
  stageCount,
  creditedStages,
  provisionalStages,
}: {
  stageCount: number;
  creditedStages: number;
  provisionalStages: number;
}) {
  if (!Number.isInteger(stageCount) || stageCount < 1) return 0;
  const credited = Math.max(0, Math.min(stageCount, creditedStages + provisionalStages));
  return Math.round((credited / stageCount) * 100);
}

export function submissionKey(attemptId: string, stageId: string, actionId: string) {
  return `${attemptId}:${stageId}:${actionId}`;
}
