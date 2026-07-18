import { describe, expect, it } from "vitest";
import { validateClassInput } from "./classes";

describe("validateClassInput", () => {
  it("accepts a teacher class name and a supported grade", () => {
    expect(
      validateClassInput({ name: "7B Grammar Lab", grade: 7 }),
    ).toEqual({ ok: true, value: { name: "7B Grammar Lab", grade: 7 } });
  });

  it("rejects a blank name and grades outside 6 to 9", () => {
    expect(validateClassInput({ name: "   ", grade: 5 })).toEqual({
      ok: false,
      errors: {
        name: "Enter a class name.",
        grade: "Choose a grade from 6 to 9.",
      },
    });
  });
});
