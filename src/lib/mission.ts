export type MissionStageId = "surgery" | "sort" | "rewrite";

export const missionStages = [
  { id: "surgery" as const, title: "Sentence Surgery", token: "CASE", prompt: "The team are reviewing the witness notes before lunch.", rule: "Does the verb agree with the singular collective noun team?" },
  { id: "sort" as const, title: "Evidence Sort", token: "FILE", prompt: "Sort each sentence by whether the subject and verb agree.", rule: "Find the real subject before deciding whether its verb agrees." },
  { id: "rewrite" as const, title: "Case File Rewrite", token: "OPEN", prompt: "Repair both statements in the case file.", rule: "Check each linked sentence for the subject that controls its verb." },
];

export const evidenceCards = [
  { sentence: "The clues are inside the blue folder.", answer: "Agrees" },
  { sentence: "A stack of reports are on the desk.", answer: "Needs revision" },
  { sentence: "Each witness has a numbered badge.", answer: "Agrees" },
  { sentence: "The detective and the clerk is checking prints.", answer: "Needs revision" },
];

export const stageGuidance: Record<MissionStageId, { answer: string; reasoning: string }> = {
  surgery: { answer: "The team is reviewing the witness notes before lunch.", reasoning: "Team is a singular collective noun here, so it needs the singular verb is." },
  sort: { answer: "Agrees; Needs revision; Agrees; Needs revision.", reasoning: "Check the true subject: stack is singular, while detective and clerk form a plural pair." },
  rewrite: { answer: "Neither the map nor the notebook was in the drawer. The clues were nearby.", reasoning: "Neither/nor joins singular nouns here, so use was. Clues is plural, so use were." },
};

export function stageIsCorrect(stage: MissionStageId, answer: string | Record<string, string> | string[]) {
  if (stage === "surgery") return typeof answer === "string" && answer.toLowerCase().replace(/\s+/g, " ").includes("team is reviewing");
  if (stage === "sort") return typeof answer === "object" && !Array.isArray(answer) && evidenceCards.every((card) => answer[card.sentence] === card.answer);
  return Array.isArray(answer) && answer.join(" ").toLowerCase().includes("notebook was") && answer.join(" ").toLowerCase().includes("clues were");
}

export function scoreForProgress(stage: number, completed: boolean) {
  const solved = completed ? 3 : stage;
  return Math.round((solved / 3) * 100);
}
