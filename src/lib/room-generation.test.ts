import { describe, expect, it } from "vitest";
import { groqOutputText, parseGeneratedRoomDraft, validateGeneratedRoomDraft } from "./room-generation";

const valid = { title: "The Missing Map", story: "Help the library team recover the map.", grade: 7, difficulty: "standard", stages: [1,2,3].map((ordinal) => ({ ordinal, title: `Stage ${ordinal}`, prompt: "The team are ready.", rule: "Match the singular subject and verb.", token: `TOKEN${ordinal}`, itemType: "free_text", acceptedAnswers: ["The team is ready."], rubric: "Use is with team.", hints: ["Find the subject."] })) };

describe("generated room validation", () => {
  it("accepts a safe, answer-keyed structured draft", () => expect(validateGeneratedRoomDraft(valid, 3)).toMatchObject({ ok: true }));
  it("rejects malformed stage counts and invalid answer keys", () => expect(validateGeneratedRoomDraft({ ...valid, stages: [{ ...valid.stages[0], acceptedAnswers: [] }] }, 3)).toMatchObject({ ok: false, errors: expect.arrayContaining(["Expected 3 stages.", "Stage 1 needs an accepted answer."]) }));
  it("rejects unsafe and ambiguous generated content", () => expect(validateGeneratedRoomDraft({ ...valid, story: "Threaten the pupil to win.", stages: valid.stages.map((stage, index) => index ? stage : { ...stage, rubric: "It depends." }) }, 3)).toMatchObject({ ok: false, errors: expect.arrayContaining(["Generated content is not age-appropriate.", "Stage 1 has an ambiguous rubric."]) }));
  it("parses only a valid structured Groq response", () => {
    expect(parseGeneratedRoomDraft(JSON.stringify(valid), 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``, 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft(`Here is your draft: ${JSON.stringify(valid)} Please review it.`, 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft("{not json", 3)).toEqual({ ok: false, errors: ["The generation response was not valid JSON."] });
  });
  it("reads either Groq response text shape", () => {
    expect(groqOutputText({ output_text: "draft" })).toBe("draft");
    expect(groqOutputText({ output: [{ content: [{ type: "output_text", text: "nested draft" }] }] })).toBe("nested draft");
  });
});
