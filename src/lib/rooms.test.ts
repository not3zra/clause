import { describe, expect, it } from "vitest";
import { createInvitePath, validateRoomInput } from "./rooms";

describe("validateRoomInput", () => {
  const validRoom = {
    classId: "class-123",
    topic: "Subject-verb agreement",
    subtopic: "Singular and plural subjects",
    theme: "Detective Office",
    stageCount: 3,
    marksVisible: false,
  };

  it("accepts a reviewed three-stage room setup", () => {
    expect(validateRoomInput(validRoom)).toEqual({ ok: true, value: validRoom });
  });

  it("requires a class, curriculum selection, supported theme, and three or four stages", () => {
    expect(
      validateRoomInput({ ...validRoom, classId: "", topic: "", theme: "Pirate Ship", stageCount: 5 }),
    ).toEqual({
      ok: false,
      errors: {
        classId: "Choose a class.",
        topic: "Choose a grammar topic.",
        theme: "Choose a supported theme.",
        stageCount: "Choose either 3 or 4 stages.",
      },
    });
  });
});

describe("createInvitePath", () => {
  it("keeps the invite token scoped to the room route", () => {
    expect(createInvitePath("invite-token-123")).toBe("/join/invite-token-123");
  });

  it("rejects an empty invite token", () => {
    expect(() => createInvitePath(" ")).toThrow("Invite token is required.");
  });
});
