import { describe, expect, it } from "vitest";
import { finalClueSequenceIsCorrect } from "./final-clue";

describe("final clue sequence", () => {
  const stages = [{ ordinal: 1, token: "CASE" }, { ordinal: 2, token: "FILE" }, { ordinal: 3, token: "OPEN" }];

  it("requires every collected clue in stage order", () => {
    expect(finalClueSequenceIsCorrect(stages, ["CASE", "FILE", "OPEN"])).toBe(true);
    expect(finalClueSequenceIsCorrect(stages, ["FILE", "CASE", "OPEN"])).toBe(false);
    expect(finalClueSequenceIsCorrect(stages, ["CASE", "FILE"])).toBe(false);
  });
});
