import { describe, expect, it } from "vitest";
import { fallbackGeneratedRoomDraft, fallbackRoomGenerationResponse, generationRepairInstruction, groqFailedGenerationText, groqOutputText, providerResponseFormat, roomGenerationSystemInstruction, parseGeneratedRoomDraft, validateGeneratedRoomDraft } from "./room-generation";

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
  it("reads Groq Chat Completions and Responses API text shapes", () => {
    expect(groqOutputText({ choices: [{ message: { content: '{"draft":true}' } }] })).toBe('{"draft":true}');
    expect(groqOutputText({ output_text: "draft" })).toBe("draft");
    expect(groqOutputText({ output: [{ content: [{ type: "output_text", text: "nested draft" }] }] })).toBe("nested draft");
    expect(groqOutputText({ output: [{ content: [{ type: "output_json", json: { draft: true } }] }] })).toBe('{"draft":true}');
    expect(groqOutputText({ output: { content: [{ type: "output_text", text: "object output" }] } })).toBe("object output");
    expect(groqOutputText({ choices: [{ message: { tool_calls: [{ function: { arguments: '{"draft":true}' } }] } }] })).toBe('{"draft":true}');
  });
  it("reads a provider-rejected draft without exposing the provider error message", () => {
    expect(groqFailedGenerationText({ error: { message: "schema validation failed", failed_generation: '{"title":"partial"}' } })).toBe('{"title":"partial"}');
    expect(groqFailedGenerationText({ error: { message: "schema validation failed" } })).toBe("");
  });
  it("turns validation failures into an explicit complete-draft retry instruction", () => {
    const instruction = generationRepairInstruction(["Expected 3 stages.", "Stage 1 needs an accepted answer.", "Each stage needs a unique token."], 3);
    expect(instruction).toContain("exactly 3 stages");
    expect(instruction).toContain("Stage 1 needs an accepted answer.");
    expect(instruction).toContain("Every stage must have a non-empty token");
  });
  it("uses JSON Schema mode while allowing a partial draft to reach the repair loop", () => {
    expect(providerResponseFormat(3)).toMatchObject({
      type: "json_schema",
      json_schema: { strict: true, schema: { properties: { stages: { minItems: 1 } } } },
    });
    expect(providerResponseFormat(3).json_schema.schema.properties.stages).not.toHaveProperty("maxItems");
  });
  it("tells free-text stages to include the required empty items array", () => {
    expect(roomGenerationSystemInstruction).toContain("items: []");
  });
  it("spells out every validator-required draft field for the model", () => {
    for (const field of ["difficulty", "ordinal", "acceptedAnswers", "rubric", "hints", "itemType", "items"]) {
      expect(roomGenerationSystemInstruction).toContain(field);
    }
    expect(roomGenerationSystemInstruction).toContain("exactly 3-5 items");
    expect(roomGenerationSystemInstruction).toContain("Agrees or Needs revision");
  });
  it("provides a validated theme-specific fallback after failed AI retries", () => {
    const fallback = fallbackGeneratedRoomDraft({ grade: 7, topic: "Clauses", subtopic: "Dependent clauses", theme: "Detective Office", stageCount: 3 });
    expect(validateGeneratedRoomDraft(fallback, 3, "Detective Office")).toMatchObject({ ok: true });
    expect(fallback.stages).toHaveLength(3);
  });

  it("keeps room generation available with a validated fallback after a provider rejection", () => {
    const response = fallbackRoomGenerationResponse({ grade: 7, topic: "Clauses", subtopic: "Dependent clauses", theme: "Detective Office", stageCount: 3 });
    expect(response).toMatchObject({ source: "fallback", validation: "fallback" });
    expect(validateGeneratedRoomDraft(response.draft, 3, "Detective Office")).toMatchObject({ ok: true });
  });
});
