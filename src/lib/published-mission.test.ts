import { describe, expect, it } from "vitest";
import { publishedMissionStages } from "./published-mission";

describe("published mission stages", () => {
  it("uses the frozen room-version content and preserves its ordinal order", () => {
    const stages = publishedMissionStages([
      { id: "stage-2", ordinal: 2, title: "Signal Check", prompt: "Classify the signal.", rule: "Check agreement.", token: "ORBIT", item_type: "deterministic", accepted_answers: ["All correct"], rubric: "Use the subject.", hints: ["Read carefully."], items: [{ prompt: "The robots are ready.", accepted_answers: ["Agrees"] }] },
      { id: "stage-1", ordinal: 1, title: "Console Repair", prompt: "Repair the console note.", rule: "Use a singular verb.", token: "SPARK", item_type: "free_text", accepted_answers: ["console is"], rubric: "Console is singular.", hints: ["Find the subject."], items: [] },
    ]);

    expect(stages.map((stage) => stage.title)).toEqual(["Console Repair", "Signal Check"]);
    expect(stages[0]).toMatchObject({ id: "stage-1", prompt: "Repair the console note.", token: "SPARK", itemType: "free_text", acceptedAnswers: ["console is"] });
    expect(stages[1].items).toEqual([{ prompt: "The robots are ready.", acceptedAnswers: ["Agrees"] }]);
  });
});
