import { describe, expect, it } from "vitest";
import { canAttachPublishedVersion } from "./attempt-version";

describe("attempt version repair", () => {
  it("only repairs an untouched attempt that has no frozen room version", () => {
    expect(canAttachPublishedVersion({ roomVersionId: null, currentStage: 0, recoveredTokens: [], completedAt: null })).toBe(true);
  });

  it("does not rewrite an attempt with any recorded progress", () => {
    expect(canAttachPublishedVersion({ roomVersionId: null, currentStage: 1, recoveredTokens: ["CLUE"], completedAt: null })).toBe(false);
    expect(canAttachPublishedVersion({ roomVersionId: "version-1", currentStage: 0, recoveredTokens: [], completedAt: null })).toBe(false);
  });
});
