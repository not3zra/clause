export function canAttachPublishedVersion({ roomVersionId, currentStage, recoveredTokens, completedAt }: {
  roomVersionId: string | null;
  currentStage: number;
  recoveredTokens: string[];
  completedAt: string | null;
}) {
  return roomVersionId === null && currentStage === 0 && recoveredTokens.length === 0 && completedAt === null;
}
