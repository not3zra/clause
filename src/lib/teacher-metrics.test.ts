import { describe, expect, it } from "vitest";
import { buildAnalytics, masteryLabel, summarizeAttempts, toAnalyticsCsv } from "./teacher-metrics";

describe("teacher review acceptance", () => {
  it("derives completion, first-attempt accuracy, hints, and deterministic mastery", () => {
    const summary = summarizeAttempts([{ currentStage: 3, completed: true, hintsUsed: 1, stageResults: { surgery: { attempts: 1, correct: true }, sort: { attempts: 1, correct: true }, rewrite: { attempts: 2, correct: true } } }]);
    expect(summary).toEqual({ completion: 100, firstAttemptAccuracy: 67, hintsUsed: 1, mastery: "Developing" });
  });

  it("never downgrades provisional credit through an override", () => {
    expect(masteryLabel({ firstAttemptAccuracy: 40, guided: false, provisional: true })).toBe("Developing");
  });

  it("aggregates persisted item events into deterministic student and rule mastery", () => {
    const analytics = buildAnalytics([
      {
        id: "attempt-1", studentName: "Asha", rollNumber: "01", currentStage: 2, stageCount: 2,
        completed: true, hintsUsed: 1, elapsedSeconds: 125, score: 100, provisionalScore: 0,
        itemAttempts: [
          { stageId: "a1", rule: "Subject-verb agreement", answer: "The team is", feedback: "Correct", verdict: "correct", creditAwarded: true, provisionalCredit: false, hintUsed: false, submittedAt: "2026-07-20T10:00:00Z" },
          { stageId: "a2", rule: "Subject-verb agreement", answer: "The clues are", feedback: "Correct", verdict: "correct", creditAwarded: true, provisionalCredit: false, hintUsed: true, submittedAt: "2026-07-20T10:01:00Z" },
        ], appeals: 1,
      },
      {
        id: "attempt-2", studentName: "Bimal", rollNumber: "02", currentStage: 1, stageCount: 2,
        completed: false, hintsUsed: 0, elapsedSeconds: 60, score: 50, provisionalScore: 50,
        itemAttempts: [
          { stageId: "b1", rule: "Subject-verb agreement", answer: "=SUM(A1)", feedback: "Check agreement", verdict: "provisional", creditAwarded: false, provisionalCredit: true, hintUsed: false, submittedAt: "2026-07-20T10:02:00Z" },
        ], appeals: 0,
      },
    ]);

    expect(analytics.summary).toMatchObject({ completion: 50, firstAttemptAccuracy: 67, hintsUsed: 1, activeAttempts: 1, elapsedSeconds: 185, appeals: 1 });
    expect(analytics.students.map((student) => [student.name, student.mastery])).toEqual([["Asha", "Secure"], ["Bimal", "Developing"]]);
    expect(analytics.rules).toEqual([{ rule: "Subject-verb agreement", firstAttemptAccuracy: 67, mastery: "Developing", itemCount: 3 }]);
  });

  it("exports CSV that is escaped and safe to open in Excel", () => {
    const csv = toAnalyticsCsv(buildAnalytics([{ id: "attempt-1", studentName: "Ada, Jr.", rollNumber: "01", currentStage: 1, stageCount: 1, completed: true, hintsUsed: 0, elapsedSeconds: 5, score: 100, provisionalScore: 0, itemAttempts: [{ stageId: "s1", rule: "Agreement", answer: "=HYPERLINK(\"bad\")", feedback: "She said \"great\"", verdict: "correct", creditAwarded: true, provisionalCredit: false, hintUsed: false, submittedAt: "2026-07-20T10:00:00Z" }], appeals: 0 }]));
    expect(csv).toContain('"Ada, Jr."');
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('"She said ""great"""');
  });

  it("does not include data outside the selected class and room scope", () => {
    const scoped = buildAnalytics([
      { id: "included", classId: "class-a", roomId: "room-a", studentName: "Asha", rollNumber: "01", currentStage: 1, stageCount: 1, completed: true, hintsUsed: 0, elapsedSeconds: 1, score: 100, provisionalScore: 0, itemAttempts: [], appeals: 0 },
      { id: "excluded", classId: "class-b", roomId: "room-b", studentName: "Other tenant", rollNumber: "02", currentStage: 1, stageCount: 1, completed: true, hintsUsed: 0, elapsedSeconds: 1, score: 100, provisionalScore: 0, itemAttempts: [], appeals: 0 },
    ], { classId: "class-a", roomId: "room-a" });
    expect(scoped.students.map((student) => student.name)).toEqual(["Asha"]);
  });

  it("counts the same room stage separately for each student's first attempt", () => {
    const analytics = buildAnalytics([
      { id: "student-a", studentName: "Asha", rollNumber: "01", currentStage: 1, stageCount: 1, completed: true, hintsUsed: 0, elapsedSeconds: 1, score: 100, provisionalScore: 0, itemAttempts: [{ stageId: "shared-stage", rule: "Agreement", answer: "is", feedback: "", verdict: "correct", creditAwarded: true, provisionalCredit: false, hintUsed: false, submittedAt: "2026-07-20T10:00:00Z" }], appeals: 0 },
      { id: "student-b", studentName: "Bimal", rollNumber: "02", currentStage: 1, stageCount: 1, completed: true, hintsUsed: 0, elapsedSeconds: 1, score: 0, provisionalScore: 0, itemAttempts: [{ stageId: "shared-stage", rule: "Agreement", answer: "are", feedback: "", verdict: "revise", creditAwarded: false, provisionalCredit: false, hintUsed: false, submittedAt: "2026-07-20T10:01:00Z" }], appeals: 0 },
    ]);
    expect(analytics.summary.firstAttemptAccuracy).toBe(50);
    expect(analytics.rules[0].firstAttemptAccuracy).toBe(50);
  });
});
