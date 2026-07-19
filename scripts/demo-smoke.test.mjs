import assert from "node:assert/strict";
import test from "node:test";
import { deploymentUrl } from "./demo-smoke.mjs";

test("requires an http deployment URL for demo smoke checks", () => {
  assert.equal(deploymentUrl({ DEMO_URL: "https://clause.example" }), "https://clause.example");
  assert.throws(() => deploymentUrl({}), /DEMO_URL/);
  assert.throws(() => deploymentUrl({ DEMO_URL: "not-a-url" }), /http/);
});
