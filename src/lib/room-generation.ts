import { RoomStage, validateRoomStages } from "./room-stages";

export type GeneratedRoomDraft = { title: string; story: string; grade: number; difficulty: "supported" | "standard" | "stretch"; stages: RoomStage[] };
type Validation = { ok: true; value: GeneratedRoomDraft } | { ok: false; errors: string[] };
const unsafe = /\b(kill|weapon|threaten|hate|suicide)\b/i;
const themeTerms: Record<string, string[]> = {
  "Detective Office": ["detective", "case", "clue", "evidence", "suspect", "witness", "alibi", "investigat"],
  "Cursed Castle": ["castle", "tower", "library", "portrait", "spell", "mystery", "gate", "chamber"],
  "Sci-Fi Lab": ["lab", "robot", "orbit", "station", "signal", "scientist", "console", "reactor"],
};

export const roomGenerationSystemInstruction = `Create a kid-safe grammar escape-room draft. Return only one complete JSON object, with no markdown or commentary. Do not include personal data, violence, threats, stereotypes, or unsafe content. Make the supplied theme the actual setting: its story and every stage must use distinct setting-specific people, places, objects, clues, and a final mystery. For Detective Office, use a non-violent case with detectives, evidence, suspects or witnesses, and clues. Do not reuse the CASE/FILE/OPEN/SEAL storyline.

Use this exact shape and field names:
{
  "title": "string",
  "story": "string",
  "grade": 6,
  "difficulty": "standard",
  "stages": [{
    "ordinal": 1,
    "title": "string",
    "prompt": "string",
    "rule": "string",
    "token": "unique non-empty string",
    "itemType": "free_text",
    "acceptedAnswers": ["answer"],
    "rubric": "specific grammar explanation",
    "hints": ["at least one non-empty hint"],
    "items": []
  }]
}

Copy the requested grade and create exactly the requested number of sequential stages. Every token must be unique. A free_text stage asks for one specific grammar repair or construction and must use "items": [] (the items: [] field must be present). A deterministic stage is a sentence classification: it must have exactly 3-5 items, and every item must be valid JSON shaped like { "prompt": "string", "acceptedAnswers": ["Agrees"] } or { "prompt": "string", "acceptedAnswers": ["Needs revision"] }. Every deterministic item answer must be exactly Agrees or Needs revision. Verify every answer key against the stated grammar rule before returning the JSON.`;

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

export function groqOutputText(data: unknown) {
  const response = data as { output_text?: unknown; output?: unknown; choices?: unknown };
  const choices = Array.isArray(response?.choices) ? response.choices : [];
  for (const choice of choices) {
    const content = (choice as { message?: { content?: unknown } } | null)?.message?.content;
    if (typeof content === "string") return content;
  }
  if (typeof response?.output_text === "string") return response.output_text;
  const output = Array.isArray(response?.output) ? response.output : [response?.output];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    const parts = Array.isArray(content) ? content : [content];
    for (const part of parts) {
      if (!part || typeof part !== "object") continue;
      const value = part as { type?: unknown; text?: unknown; json?: unknown };
      if (value.type === "output_text" && typeof value.text === "string") return value.text;
      if (value.type === "output_json" && value.json !== undefined) return JSON.stringify(value.json);
    }
  }
  for (const choice of choices) {
    const calls = (choice as { message?: { tool_calls?: unknown } } | null)?.message?.tool_calls;
    if (!Array.isArray(calls)) continue;
    for (const call of calls) {
      const argumentsText = (call as { function?: { arguments?: unknown } } | null)?.function?.arguments;
      if (typeof argumentsText === "string") return argumentsText;
    }
  }
  return "";
}

export function groqFailedGenerationText(data: unknown) {
  const failed = (data as { error?: { failed_generation?: unknown } } | null)?.error?.failed_generation;
  return typeof failed === "string" ? failed : "";
}

export function providerStageCountSchema() {
  // Let our local validator inspect short drafts and send the model a targeted
  // repair instruction. Groq can reject a short draft before that retry runs.
  return { minItems: 1 };
}

export function providerResponseFormat(stageCount: 3 | 4) {
  const stageSchema = {
    type: "object",
    additionalProperties: false,
    required: ["ordinal", "title", "prompt", "rule", "token", "itemType", "acceptedAnswers", "rubric", "hints", "items"],
    properties: {
      ordinal: { type: "integer", minimum: 1, maximum: stageCount },
      title: { type: "string", minLength: 1 },
      prompt: { type: "string", minLength: 1 },
      rule: { type: "string", minLength: 1 },
      token: { type: "string", minLength: 1, maxLength: 32 },
      itemType: { type: "string", enum: ["deterministic", "free_text"] },
      acceptedAnswers: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      rubric: { type: "string", minLength: 1 },
      hints: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["prompt", "acceptedAnswers"],
          properties: {
            prompt: { type: "string", minLength: 1 },
            acceptedAnswers: { type: "array", minItems: 1, items: { type: "string", minLength: 1 } },
          },
        },
      },
    },
  };
  return {
    type: "json_schema" as const,
    json_schema: {
      name: "room_draft",
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: ["title", "story", "grade", "difficulty", "stages"],
        properties: {
          title: { type: "string", minLength: 1 },
          story: { type: "string", minLength: 1 },
          grade: { type: "integer", minimum: 6, maximum: 9 },
          difficulty: { type: "string", enum: ["supported", "standard", "stretch"] },
          stages: { type: "array", ...providerStageCountSchema(), items: stageSchema },
        },
      },
    },
  };
}

export function generationRepairInstruction(errors: string[], stageCount: number) {
  return `Your previous draft was rejected for: ${errors.join(" ")} Return a complete replacement JSON draft with exactly ${stageCount} stages, not commentary. Every stage must have a non-empty token that is unique within the room, at least one accepted answer, at least one hint, and all required learning-content fields. Deterministic items must each have exactly one answer: Agrees or Needs revision.`;
}

export type RoomGenerationInput = { grade: number; topic: string; subtopic: string; theme: string; stageCount: 3 | 4; instructions?: string };

const fallbackThemes: Record<string, { title: string; story: string; place: string; objects: string[] }> = {
  "Detective Office": {
    title: "The Missing Grammar File",
    story: "Detective Mira is using evidence from a witness notebook to solve a quiet library case. Each correct grammar repair reveals the next clue.",
    place: "detective office",
    objects: ["clue card", "evidence file", "witness note", "case seal"],
  },
  "Cursed Castle": {
    title: "The Castle Grammar Map",
    story: "At the Cursed Castle, the librarian needs help reading a tower map, a portrait clue, and a harmless old spell before the library gate can open.",
    place: "castle library",
    objects: ["tower map", "portrait clue", "spell page", "library gate"],
  },
  "Sci-Fi Lab": {
    title: "The Signal Station Repair",
    story: "In the Sci-Fi Lab, a robot scientist is decoding a station signal from the orbit console before the reactor report is filed.",
    place: "science lab",
    objects: ["robot log", "station signal", "orbit console", "reactor report"],
  },
};

export function fallbackGeneratedRoomDraft(input: RoomGenerationInput): GeneratedRoomDraft {
  const theme = fallbackThemes[input.theme] ?? fallbackThemes["Detective Office"];
  const tokens = ["CLUE", "FILE", "MAP", "SEAL"];
  return {
    title: `${theme.title}: ${input.topic.trim()}`,
    story: theme.story,
    grade: input.grade,
    difficulty: "standard",
    stages: Array.from({ length: input.stageCount }, (_, index) => ({
      ordinal: index + 1,
      title: `${theme.objects[index]} grammar check`,
      prompt: `At the ${theme.place}, repair this note from the ${theme.objects[index]}: “The team are ready.”`,
      rule: `Apply the ${input.topic.trim()} focus, especially ${input.subtopic.trim()}, and make the subject and verb agree.`,
      token: tokens[index],
      itemType: "free_text" as const,
      acceptedAnswers: ["The team is ready."],
      rubric: "Team is singular in this note, so it takes is.",
      hints: ["Find the subject before choosing the verb."],
    })),
  };
}

export function fallbackRoomGenerationResponse(input: RoomGenerationInput) {
  return {
    draft: fallbackGeneratedRoomDraft(input),
    source: "fallback" as const,
    validation: "fallback" as const,
  };
}

export function isRoomGenerationInput(value: unknown): value is RoomGenerationInput {
  const input = value as Partial<RoomGenerationInput>;
  return Boolean(input && Number.isInteger(input.grade) && input.grade! >= 6 && input.grade! <= 9 && typeof input.topic === "string" && input.topic.trim() && typeof input.subtopic === "string" && input.subtopic.trim() && typeof input.theme === "string" && input.theme.trim() && (input.stageCount === 3 || input.stageCount === 4) && (input.instructions === undefined || (typeof input.instructions === "string" && input.instructions.length <= 500)));
}
