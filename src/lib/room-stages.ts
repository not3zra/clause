export type RoomStageItem = { prompt: string; acceptedAnswers: string[] };
export type RoomStage = {
  id?: string;
  ordinal: number;
  title: string;
  prompt: string;
  rule: string;
  token: string;
  itemType: "deterministic" | "free_text";
  acceptedAnswers: string[];
  rubric: string;
  hints: string[];
  items?: RoomStageItem[];
};

export type ValidRoomStages = { ok: true; value: RoomStage[] };
export type InvalidRoomStages = { ok: false; errors: string[] };

export function validateRoomStages(stages: RoomStage[], expectedCount: number): ValidRoomStages | InvalidRoomStages {
  const errors: string[] = [];
  if (expectedCount !== 3 && expectedCount !== 4) errors.push("A room must contain three or four stages.");
  if (stages.length !== expectedCount) errors.push(`Expected ${expectedCount} stages.`);
  const ordinals = new Set<number>();
  const tokens = new Set<string>();
  for (const stage of stages) {
    if (!Number.isInteger(stage.ordinal) || stage.ordinal < 1 || stage.ordinal > expectedCount || ordinals.has(stage.ordinal)) errors.push("Stage ordinals must be unique and sequential.");
    ordinals.add(stage.ordinal);
    if (!stage.title.trim() || !stage.prompt.trim() || !stage.rule.trim() || !stage.rubric.trim()) errors.push(`Stage ${stage.ordinal} needs its learning content.`);
    if (!stage.token.trim() || tokens.has(stage.token.trim().toLowerCase())) errors.push("Each stage needs a unique token.");
    tokens.add(stage.token.trim().toLowerCase());
    if (!stage.hints.length || stage.hints.some((hint) => !hint.trim())) errors.push(`Stage ${stage.ordinal} needs at least one hint.`);
    if (!stage.acceptedAnswers.length || stage.acceptedAnswers.some((answer) => !answer.trim())) errors.push(`Stage ${stage.ordinal} needs an accepted answer.`);
    if (stage.itemType === "deterministic" && (!stage.items?.length || stage.items.some((item) => !item.prompt.trim() || !item.acceptedAnswers.length))) errors.push(`Deterministic stage ${stage.ordinal} needs answer-keyed items.`);
  }
  for (let ordinal = 1; ordinal <= expectedCount; ordinal += 1) if (!ordinals.has(ordinal)) errors.push("Stage ordinals must be unique and sequential.");
  return errors.length ? { ok: false, errors: [...new Set(errors)] } : { ok: true, value: stages };
}

export function roomStageIsCorrect(stage: RoomStage, answer: string | Record<string, string>) {
  if (stage.itemType === "deterministic") return Boolean(stage.items?.every((item) => item.acceptedAnswers.some((accepted) => answer as Record<string, string> && (answer as Record<string, string>)[item.prompt] === accepted)));
  const submitted = typeof answer === "string" ? answer.trim().toLowerCase().replace(/\s+/g, " ") : "";
  return stage.acceptedAnswers.some((accepted) => submitted.includes(accepted.trim().toLowerCase().replace(/\s+/g, " ")));
}

export function defaultRoomStages(stageCount: 3 | 4): RoomStage[] {
  const stages: RoomStage[] = [
    { ordinal: 1, title: "Sentence Surgery", prompt: "The team are reviewing the witness notes before lunch.", rule: "Does the verb agree with the singular collective noun team?", token: "CASE", itemType: "free_text", acceptedAnswers: ["The team is reviewing"], rubric: "Team is singular here, so it takes is.", hints: ["Find the subject before changing the verb."] },
    { ordinal: 2, title: "Evidence Sort", prompt: "Sort each sentence by whether the subject and verb agree.", rule: "Find the real subject before deciding whether its verb agrees.", token: "FILE", itemType: "deterministic", acceptedAnswers: ["All evidence sorted"], rubric: "Check the true subject in every sentence.", hints: ["Ignore phrases between the subject and verb."], items: [
      { prompt: "The clues are inside the blue folder.", acceptedAnswers: ["Agrees"] }, { prompt: "A stack of reports are on the desk.", acceptedAnswers: ["Needs revision"] }, { prompt: "Each witness has a numbered badge.", acceptedAnswers: ["Agrees"] }, { prompt: "The detective and the clerk is checking prints.", acceptedAnswers: ["Needs revision"] },
    ] },
    { ordinal: 3, title: "Case File Rewrite", prompt: "Repair both statements in the case file.", rule: "Check each linked sentence for the subject that controls its verb.", token: "OPEN", itemType: "free_text", acceptedAnswers: ["notebook was", "clues were"], rubric: "Neither/nor uses was here; clues takes were.", hints: ["Check each sentence separately."] },
  ];
  if (stageCount === 4) stages.push({ ordinal: 4, title: "Final Statement", prompt: "Write one sentence using a singular subject and matching verb.", rule: "A singular subject needs a singular verb.", token: "SEAL", itemType: "free_text", acceptedAnswers: ["is", "was", "has"], rubric: "The subject and verb must agree.", hints: ["Start with one person, place, or thing."] });
  return stages;
}
