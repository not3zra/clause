import { describe, expect, it } from "vitest";
import { evidenceCards, scoreForProgress, stageIsCorrect } from "./mission";

describe("mission grading fallbacks", () => {
  it("accepts the target grammar repairs without requiring one exact sentence", () => {
    expect(stageIsCorrect("surgery", "The team is reviewing notes.")).toBe(true);
    expect(stageIsCorrect("rewrite", ["Neither the map nor the notebook was there.", "The clues were nearby."])).toBe(true);
  });

  it("requires every deterministic evidence classification", () => {
    const answers = Object.fromEntries(evidenceCards.map((card) => [card.sentence, card.answer]));
    expect(stageIsCorrect("sort", answers)).toBe(true);
    expect(scoreForProgress(2, false)).toBe(67);
  });
});
