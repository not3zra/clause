import { describe, expect, it } from "vitest";
import { fallbackGrade, prepareGradingPayload } from "./grading";

const teamInput = { original: "The team are reviewing the witness notes before lunch.", targetRule: "subject-verb agreement", rubric: "Use a singular verb with team.", grade: 7, subtopic: "collective nouns" };

describe("target-rule-first grading regressions", () => {
  it.each([
    ["The team is reviewing the witness notes before lunch.", "correct"],
    ["The team is reviewing the witness notes before lunch!", "correct_with_improvement"],
    ["The team are reviewing the notes.", "revise"],
    ["The teams are reviewing the witness notes.", "provisional"],
    ["The team is review the witness notes.", "revise"],
    ["Each witness has a badge.", "correct"],
    ["Each witness have a badge.", "revise"],
    ["Neither the map nor the notebook was in the drawer.", "correct"],
    ["Neither the map nor the notebook were in the drawer.", "revise"],
    ["The clues were nearby.", "correct"],
    ["The clues was nearby.", "revise"],
    ["The team is reviewing the witness notes, colourfully.", "correct_with_improvement"],
    ["The team is reviewing their witness notes.", "correct_with_improvement"],
    ["I corrected the sentence.", "revise"],
    ["", "revise"],
  ])("classifies %s", (submitted, verdict) => {
    expect(fallbackGrade({ ...teamInput, submitted }).verdict).toBe(verdict);
  });

  it("sends only grammar context to the model", () => {
    expect(prepareGradingPayload({ ...teamInput, submitted: "The team is reviewing.", fullName: "Aarav", rollNumber: "7B-04", inviteToken: "secret" } as never)).toEqual({ ...teamInput, submitted: "The team is reviewing." });
  });
});
