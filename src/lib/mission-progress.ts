export type MissionPhase = "launch" | "stages" | "lock" | "success";

export function phaseForAttempt(currentStage: number, stageCount: number, completedAt: string | null): MissionPhase {
  if (completedAt) return "success";
  return currentStage >= stageCount ? "lock" : "stages";
}

export function orderedTokensMatch(selectedTokens: string[], expectedTokens: string[]) {
  return selectedTokens.length === expectedTokens.length && selectedTokens.every((token, index) => token === expectedTokens[index]);
}
