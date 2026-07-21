import assert from "node:assert/strict";
import test from "node:test";
import { geminiConfiguration } from "./gemini-config.mjs";

test("accepts the approved free-tier Gemini model without exposing its key", () => {
  const result = geminiConfiguration({ GEMINI_API_KEY: "test_secret", GEMINI_MODEL: "gemini-2.5-flash-lite" });
  assert.deepEqual(result, { configured: true, missing: [], model: "gemini-2.5-flash-lite", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.equal(JSON.stringify(result).includes("test_secret"), false);
});

test("requires a Gemini key and preserves safe rate-limit validation", () => {
  assert.deepEqual(geminiConfiguration({}), { configured: false, missing: ["GEMINI_API_KEY"], model: "gemini-2.5-flash-lite", perStudentHourlyLimit: 10, globalPerMinuteLimit: 30 });
  assert.throws(() => geminiConfiguration({ GEMINI_API_KEY: "key", GEMINI_MODEL: "other" }), /not approved/);
});
