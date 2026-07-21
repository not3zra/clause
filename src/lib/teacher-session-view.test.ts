import { describe, expect, it } from "vitest";
import { teacherSessionAction, teacherSessionView } from "./teacher-session-view";

describe("teacher session view", () => {
  it("does not show sign-in controls while the stored session is resolving", () => {
    expect(teacherSessionView(false, null)).toBe("loading");
  });

  it("shows either the signed-out or signed-in view after resolution", () => {
    expect(teacherSessionView(true, null)).toBe("signed_out");
    expect(teacherSessionView(true, "teacher-id")).toBe("signed_in");
  });

  it("does not clear a restored teacher session for an empty non-sign-out auth event", () => {
    expect(teacherSessionAction("INITIAL_SESSION", false)).toBe("ignore");
    expect(teacherSessionAction("TOKEN_REFRESHED", true)).toBe("restore");
    expect(teacherSessionAction("SIGNED_OUT", false)).toBe("clear");
  });
});
