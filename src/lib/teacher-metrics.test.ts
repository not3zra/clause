import { describe, expect, it } from "vitest";
import { masteryLabel, summarizeAttempts } from "./teacher-metrics";

describe("teacher review acceptance", () => {
  it("derives completion, first-attempt accuracy, hints, and deterministic mastery", () => {
    const summary = summarizeAttempts([{ currentStage: 3, completed: true, hintsUsed: 1, stageResults: { surgery: { attempts: 1, correct: true }, sort: { attempts: 1, correct: true }, rewrite: { attempts: 2, correct: true } } }]);
    expect(summary).toEqual({ completion: 100, firstAttemptAccuracy: 67, hintsUsed: 1, mastery: "Developing" });
  });

  it("never downgrades provisional credit through an override", () => {
    expect(masteryLabel({ firstAttemptAccuracy: 40, guided: false, provisional: true })).toBe("Developing");
  });
});
