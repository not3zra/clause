import { describe, expect, it } from "vitest";
import { teacherSessionView } from "./teacher-session-view";

describe("teacher session view", () => {
  it("does not show sign-in controls while the stored session is resolving", () => {
    expect(teacherSessionView(false, null)).toBe("loading");
  });

  it("shows either the signed-out or signed-in view after resolution", () => {
    expect(teacherSessionView(true, null)).toBe("signed_out");
    expect(teacherSessionView(true, "teacher-id")).toBe("signed_in");
  });
});
