import assert from "node:assert/strict";
import test from "node:test";
import { groqConfiguration } from "./groq-config.mjs";

test("accepts the approved free-tier Groq model without exposing its key", () => {
  const result = groqConfiguration({ GROQ_API_KEY: "gsk_test_secret", GROQ_MODEL: "openai/gpt-oss-20b" });
  assert.deepEqual(result, { configured: true, missing: [], model: "openai/gpt-oss-20b", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.equal(JSON.stringify(result).includes("gsk_test_secret"), false);
});

test("requires a Groq key and preserves safe rate-limit validation", () => {
  assert.deepEqual(groqConfiguration({}), { configured: false, missing: ["GROQ_API_KEY"], model: "openai/gpt-oss-20b", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.throws(() => groqConfiguration({ GROQ_API_KEY: "key", GROQ_MODEL: "other" }), /not approved/);
});
