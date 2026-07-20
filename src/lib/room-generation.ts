import { RoomStage, validateRoomStages } from "./room-stages";

export type GeneratedRoomDraft = { title: string; story: string; grade: number; difficulty: "supported" | "standard" | "stretch"; stages: RoomStage[] };
type Validation = { ok: true; value: GeneratedRoomDraft } | { ok: false; errors: string[] };
const unsafe = /\b(kill|weapon|threaten|hate|suicide)\b/i;

export function validateGeneratedRoomDraft(value: unknown, stageCount: number): Validation {
  const draft = value as Partial<GeneratedRoomDraft>;
  const errors: string[] = [];
  if (!draft || typeof draft.title !== "string" || !draft.title.trim() || typeof draft.story !== "string" || !draft.story.trim()) errors.push("Generated draft needs a title and story.");
  if (!Number.isInteger(draft.grade) || (draft.grade ?? 0) < 6 || (draft.grade ?? 0) > 9) errors.push("Generated draft has an invalid grade.");
  if (!["supported", "standard", "stretch"].includes(draft.difficulty ?? "")) errors.push("Generated draft has an invalid difficulty.");
  if (unsafe.test(`${draft.title ?? ""} ${draft.story ?? ""} ${(draft.stages ?? []).map((stage) => `${stage.prompt} ${stage.rubric}`).join(" ")}`)) errors.push("Generated content is not age-appropriate.");
  const stages = Array.isArray(draft.stages) ? draft.stages : [];
  const stageResult = validateRoomStages(stages, stageCount);
  if (!stageResult.ok) errors.push(...stageResult.errors);
  stages.forEach((stage) => { if (/\b(it depends|maybe correct|varies)\b/i.test(stage.rubric ?? "")) errors.push(`Stage ${stage.ordinal} has an ambiguous rubric.`); });
  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, value: draft as GeneratedRoomDraft };
}

export function parseGeneratedRoomDraft(outputText: string, stageCount: number): Validation {
  const cleaned = outputText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{"); const last = cleaned.lastIndexOf("}");
  const json = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  try { return validateGeneratedRoomDraft(JSON.parse(json), stageCount); }
  catch { return { ok: false, errors: ["The generation response was not valid JSON."] }; }
}

export function groqOutputText(data: unknown) {
  const response = data as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof response?.output_text === "string") return response.output_text;
  return response?.output?.flatMap((item) => item.content ?? []).find((content) => content.type === "output_text")?.text ?? "";
}

export type RoomGenerationInput = { grade: number; topic: string; subtopic: string; theme: string; stageCount: 3 | 4; instructions?: string };
export function isRoomGenerationInput(value: unknown): value is RoomGenerationInput {
  const input = value as Partial<RoomGenerationInput>;
  return Boolean(input && Number.isInteger(input.grade) && input.grade! >= 6 && input.grade! <= 9 && typeof input.topic === "string" && input.topic.trim() && typeof input.subtopic === "string" && input.subtopic.trim() && typeof input.theme === "string" && input.theme.trim() && (input.stageCount === 3 || input.stageCount === 4) && (input.instructions === undefined || (typeof input.instructions === "string" && input.instructions.length <= 500)));
}
