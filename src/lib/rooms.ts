export type RoomInput = {
  classId: string;
  topic: string;
  subtopic: string;
  theme: string;
  stageCount: number;
  marksVisible: boolean;
};

type ValidRoomInput = { ok: true; value: RoomInput };
type InvalidRoomInput = { ok: false; errors: Partial<Record<keyof RoomInput, string>> };

const THEMES = ["Detective Office", "Cursed Castle", "Sci-Fi Lab"];

export function validateRoomInput(input: RoomInput): ValidRoomInput | InvalidRoomInput {
  const errors: InvalidRoomInput["errors"] = {};
  const value = { ...input, classId: input.classId.trim(), topic: input.topic.trim(), subtopic: input.subtopic.trim() };

  if (!value.classId) errors.classId = "Choose a class.";
  if (!value.topic) errors.topic = "Choose a grammar topic.";
  if (!value.subtopic) errors.subtopic = "Choose a grammar subtopic.";
  if (!THEMES.includes(value.theme)) errors.theme = "Choose a supported theme.";
  if (value.stageCount !== 3 && value.stageCount !== 4) errors.stageCount = "Choose either 3 or 4 stages.";

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value };
}

export function createInvitePath(inviteToken: string) {
  const token = inviteToken.trim();
  if (!token) throw new Error("Invite token is required.");
  return `/join/${encodeURIComponent(token)}`;
}
