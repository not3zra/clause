import { describe, expect, it } from "vitest";
import { roomStageIsCorrect, validateRoomStages } from "./room-stages";

const freeStage = (ordinal: number) => ({ ordinal, title: `Stage ${ordinal}`, prompt: "Correct the sentence.", rule: "Match subject and verb.", token: `TOKEN${ordinal}`, itemType: "free_text" as const, acceptedAnswers: ["The team is ready."], rubric: "The verb agrees.", hints: ["Find the subject."] });

describe("room-version stage validation", () => {
  it("accepts a complete four-stage published version", () => {
    expect(validateRoomStages([1, 2, 3, 4].map(freeStage), 4)).toMatchObject({ ok: true });
  });

  it("rejects wrong stage counts and incomplete answer-key data", () => {
    expect(validateRoomStages([{ ...freeStage(1), token: "" }, freeStage(2), freeStage(2)], 4)).toEqual({ ok: false, errors: expect.arrayContaining(["Expected 4 stages.", "Stage ordinals must be unique and sequential.", "Each stage needs a unique token."]) });
  });

  it("grades both free-text and deterministic persisted stages", () => {
    expect(roomStageIsCorrect(freeStage(1), "The team is ready.")).toBe(true);
    const deterministic = { ...freeStage(1), itemType: "deterministic" as const, items: [{ prompt: "The clues are here.", acceptedAnswers: ["Agrees"] }] };
    expect(roomStageIsCorrect(deterministic, { "The clues are here.": "Agrees" })).toBe(true);
  });
});
