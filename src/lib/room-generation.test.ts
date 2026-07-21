import { describe, expect, it } from "vitest";
import { generationRepairInstruction, groqOutputText, providerStageCountSchema, parseGeneratedRoomDraft, validateGeneratedRoomDraft } from "./room-generation";

const valid = { title: "The Missing Map", story: "Help the library team recover the map.", grade: 7, difficulty: "standard", stages: [1,2,3].map((ordinal) => ({ ordinal, title: `Stage ${ordinal}`, prompt: "The team are ready.", rule: "Match the singular subject and verb.", token: `TOKEN${ordinal}`, itemType: "free_text", acceptedAnswers: ["The team is ready."], rubric: "Use is with team.", hints: ["Find the subject."] })) };

describe("generated room validation", () => {
  it("accepts a safe, answer-keyed structured draft", () => expect(validateGeneratedRoomDraft(valid, 3)).toMatchObject({ ok: true }));
  it("rejects malformed stage counts and invalid answer keys", () => expect(validateGeneratedRoomDraft({ ...valid, stages: [{ ...valid.stages[0], acceptedAnswers: [] }] }, 3)).toMatchObject({ ok: false, errors: expect.arrayContaining(["Expected 3 stages.", "Stage 1 needs an accepted answer."]) }));
  it("rejects unsafe and ambiguous generated content", () => expect(validateGeneratedRoomDraft({ ...valid, story: "Threaten the pupil to win.", stages: valid.stages.map((stage, index) => index ? stage : { ...stage, rubric: "It depends." }) }, 3)).toMatchObject({ ok: false, errors: expect.arrayContaining(["Generated content is not age-appropriate.", "Stage 1 has an ambiguous rubric."]) }));
  it("rejects mismatched exercise shapes and a detective draft without detective content", () => {
    const deterministic = { ...valid, stages: valid.stages.map((stage, index) => index ? stage : { ...stage, itemType: "deterministic" as const, items: [{ prompt: "The file is ready.", acceptedAnswers: ["Maybe"] }] }) };
    expect(validateGeneratedRoomDraft(deterministic, 3, "Detective Office")).toMatchObject({ ok: false, errors: expect.arrayContaining(["Deterministic stage 1 must use Agrees or Needs revision answer keys.", "Detective Office drafts need detective-specific story and clue content."]) });
  });
  it("parses only a valid structured Groq response", () => {
    expect(parseGeneratedRoomDraft(JSON.stringify(valid), 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft(`\`\`\`json\n${JSON.stringify(valid)}\n\`\`\``, 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft(`Here is your draft: ${JSON.stringify(valid)} Please review it.`, 3)).toMatchObject({ ok: true });
    expect(parseGeneratedRoomDraft("{not json", 3)).toEqual({ ok: false, errors: ["The generation response was not valid JSON."] });
  });
  it("reads either Groq response text shape", () => {
    expect(groqOutputText({ output_text: "draft" })).toBe("draft");
    expect(groqOutputText({ output: [{ content: [{ type: "output_text", text: "nested draft" }] }] })).toBe("nested draft");
    expect(groqOutputText({ output: [{ content: [{ type: "output_json", json: { draft: true } }] }] })).toBe('{"draft":true}');
    expect(groqOutputText({ output: { content: [{ type: "output_text", text: "object output" }] } })).toBe("object output");
  });
  it("turns validation failures into an explicit complete-draft retry instruction", () => {
    const instruction = generationRepairInstruction(["Expected 3 stages.", "Stage 1 needs an accepted answer.", "Each stage needs a unique token."], 3);
    expect(instruction).toContain("exactly 3 stages");
    expect(instruction).toContain("Stage 1 needs an accepted answer.");
    expect(instruction).toContain("Every stage must have a non-empty token");
  });
  it("keeps the provider schema permissive enough for server-side repair", () => {
    expect(providerStageCountSchema()).toEqual({ minItems: 1 });
  });
});
