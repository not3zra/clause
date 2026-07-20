import { describe, expect, it } from "vitest";
import { scoreAttempt, submissionKey } from "./attempt-scoring";

describe("scoreAttempt", () => {
  it("uses the published room stage count, including four-stage rooms", () => {
    expect(scoreAttempt({ stageCount: 3, creditedStages: 2, provisionalStages: 0 })).toBe(67);
    expect(scoreAttempt({ stageCount: 4, creditedStages: 3, provisionalStages: 1 })).toBe(100);
  });

  it("keeps provisional credit and never lets an appeal lower the earned total", () => {
    expect(scoreAttempt({ stageCount: 4, creditedStages: 1, provisionalStages: 1 })).toBe(50);
    expect(scoreAttempt({ stageCount: 4, creditedStages: 2, provisionalStages: 0 })).toBe(50);
  });
});

describe("submissionKey", () => {
  it("is stable for a retry of the same client action and distinct for another action", () => {
    expect(submissionKey("attempt", "stage", "action-1")).toBe(submissionKey("attempt", "stage", "action-1"));
    expect(submissionKey("attempt", "stage", "action-1")).not.toBe(submissionKey("attempt", "stage", "action-2"));
  });
});
