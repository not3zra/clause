import assert from "node:assert/strict";
import test from "node:test";
import { openAiConfiguration } from "./openai-config.mjs";

test("accepts a server-only key and approved guardrail defaults without exposing the key", () => {
  const result = openAiConfiguration({ OPENAI_API_KEY: "sk-test-secret", OPENAI_MODEL: "gpt-5-mini" });
  assert.deepEqual(result, { configured: true, missing: [], model: "gpt-5-mini", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.equal(JSON.stringify(result).includes("sk-test-secret"), false);
});

test("reports a missing key and rejects unapproved model or unsafe rate limits", () => {
  assert.deepEqual(openAiConfiguration({}), { configured: false, missing: ["OPENAI_API_KEY"], model: "gpt-5-mini", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.throws(() => openAiConfiguration({ OPENAI_API_KEY: "key", OPENAI_MODEL: "gpt-5.6-sol" }), /not approved/);
  assert.throws(() => openAiConfiguration({ OPENAI_API_KEY: "key", AI_MAX_REQUESTS_PER_STUDENT_PER_HOUR: "0" }), /positive integer/);
});
