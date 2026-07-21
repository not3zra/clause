import { describe, expect, it } from "vitest";
import { orderedTokensMatch, phaseForAttempt } from "./mission-progress";

describe("published mission completion", () => {
  it("unlocks the final clue before marking a mission complete", () => {
    expect(phaseForAttempt(3, 3, null)).toBe("lock");
    expect(phaseForAttempt(3, 3, "2026-07-22T10:00:00Z")).toBe("success");
  });

  it("accepts only the recovered tokens in their published order", () => {
    expect(orderedTokensMatch(["SPARK", "ORBIT"], ["SPARK", "ORBIT"])).toBe(true);
    expect(orderedTokensMatch(["ORBIT", "SPARK"], ["SPARK", "ORBIT"])).toBe(false);
  });

});
