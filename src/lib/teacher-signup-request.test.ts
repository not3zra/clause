import { describe, expect, it } from "vitest";
import { teacherSignUpRequest } from "./teacher-signup-request";

describe("teacher sign-up request", () => {
  it("requests a confirmation email with the deployed app as its return URL", () => {
    expect(teacherSignUpRequest({ email: "teacher@example.com", password: "correct horse battery staple", displayName: "Ada" }, "https://clause-learn.vercel.app")).toEqual({
      email: "teacher@example.com",
      password: "correct horse battery staple",
      options: {
        data: { display_name: "Ada", account_type: "teacher" },
        emailRedirectTo: "https://clause-learn.vercel.app/",
      },
    });
  });
});
