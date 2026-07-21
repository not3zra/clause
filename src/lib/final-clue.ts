export type FinalClueStage = { ordinal: number; token: string };

export function finalClueSequenceIsCorrect(stages: FinalClueStage[], selectedTokens: string[]) {
  const expected = [...stages].sort((a, b) => a.ordinal - b.ordinal).map((stage) => stage.token.trim().toLowerCase());
  return expected.length === selectedTokens.length && expected.every((token, index) => token === selectedTokens[index]?.trim().toLowerCase());
}
