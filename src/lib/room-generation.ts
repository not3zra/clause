import { RoomStage, validateRoomStages } from "./room-stages";

export type GeneratedRoomDraft = { title: string; story: string; grade: number; difficulty: "supported" | "standard" | "stretch"; stages: RoomStage[] };
type Validation = { ok: true; value: GeneratedRoomDraft } | { ok: false; errors: string[] };
const unsafe = /\b(kill|weapon|threaten|hate|suicide)\b/i;
const themeTerms: Record<string, string[]> = {
  "Detective Office": ["detective", "case", "clue", "evidence", "suspect", "witness", "alibi", "investigat"],
  "Cursed Castle": ["castle", "tower", "library", "portrait", "spell", "mystery", "gate", "chamber"],
  "Sci-Fi Lab": ["lab", "robot", "orbit", "station", "signal", "scientist", "console", "reactor"],
};

export function validateGeneratedRoomDraft(value: unknown, stageCount: number, theme?: string): Validation {
  const draft = value as Partial<GeneratedRoomDraft>;
  const errors: string[] = [];
  if (!draft || typeof draft.title !== "string" || !draft.title.trim() || typeof draft.story !== "string" || !draft.story.trim()) errors.push("Generated draft needs a title and story.");
  if (!Number.isInteger(draft.grade) || (draft.grade ?? 0) < 6 || (draft.grade ?? 0) > 9) errors.push("Generated draft has an invalid grade.");
  if (!["supported", "standard", "stretch"].includes(draft.difficulty ?? "")) errors.push("Generated draft has an invalid difficulty.");
  if (unsafe.test(`${draft.title ?? ""} ${draft.story ?? ""} ${(draft.stages ?? []).map((stage) => `${stage.prompt} ${stage.rubric}`).join(" ")}`)) errors.push("Generated content is not age-appropriate.");
  const stages = Array.isArray(draft.stages) ? draft.stages : [];
  const stageResult = validateRoomStages(stages, stageCount);
  if (!stageResult.ok) errors.push(...stageResult.errors);
  stages.forEach((stage) => {
    if (/\b(it depends|maybe correct|varies)\b/i.test(stage.rubric ?? "")) errors.push(`Stage ${stage.ordinal} has an ambiguous rubric.`);
    if (stage.itemType === "deterministic" && stage.items?.some((item) => item.acceptedAnswers.length !== 1 || !["Agrees", "Needs revision"].includes(item.acceptedAnswers[0]))) errors.push(`Deterministic stage ${stage.ordinal} must use Agrees or Needs revision answer keys.`);
    if (stage.itemType === "free_text" && stage.items?.length) errors.push(`Free-text stage ${stage.ordinal} cannot include classification items.`);
  });
  const requiredThemeTerms = themeTerms[theme ?? ""];
  if (requiredThemeTerms) {
    const content = `${draft.title ?? ""} ${draft.story ?? ""} ${stages.map((stage) => `${stage.title} ${stage.prompt} ${stage.rubric}`).join(" ")}`.toLowerCase();
    if (requiredThemeTerms.filter((term) => content.includes(term)).length < 3) errors.push(`${theme} drafts need ${theme === "Detective Office" ? "detective-specific story and clue" : "theme-specific story and puzzle"} content.`);
  }
  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, value: draft as GeneratedRoomDraft };
}

export function parseGeneratedRoomDraft(outputText: string, stageCount: number, theme?: string): Validation {
  const cleaned = outputText.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const first = cleaned.indexOf("{"); const last = cleaned.lastIndexOf("}");
  const json = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
  try { return validateGeneratedRoomDraft(JSON.parse(json), stageCount, theme); }
  catch { return { ok: false, errors: ["The generation response was not valid JSON."] }; }
}

export function geminiOutputText(data: unknown) {
  const response = data as { candidates?: unknown };
  const candidates = Array.isArray(response?.candidates) ? response.candidates : [];
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue;
    const content = (candidate as { content?: unknown }).content;
    const parts = Array.isArray((content as { parts?: unknown })?.parts) ? (content as { parts: unknown[] }).parts : [];
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const value = part as { text?: unknown };
      if (typeof value.text === "string") return value.text;
    }
  }
  return "";
}

export function generationRepairInstruction(errors: string[]) {
  return `Your previous draft was rejected for: ${errors.join(" ")} Return a complete replacement JSON draft, not commentary. Every stage must have a non-empty token that is unique within the room, at least one accepted answer, at least one hint, and all required learning-content fields. Deterministic items must each have exactly one answer: Agrees or Needs revision.`;
}

export type RoomGenerationInput = { grade: number; topic: string; subtopic: string; theme: string; stageCount: 3 | 4; instructions?: string };
export function isRoomGenerationInput(value: unknown): value is RoomGenerationInput {
  const input = value as Partial<RoomGenerationInput>;
  return Boolean(input && Number.isInteger(input.grade) && input.grade! >= 6 && input.grade! <= 9 && typeof input.topic === "string" && input.topic.trim() && typeof input.subtopic === "string" && input.subtopic.trim() && typeof input.theme === "string" && input.theme.trim() && (input.stageCount === 3 || input.stageCount === 4) && (input.instructions === undefined || (typeof input.instructions === "string" && input.instructions.length <= 500)));
}
