import { describe, expect, it } from "vitest";
import { contentSecurityPolicy } from "./content-security-policy";

describe("content security policy", () => {
  it("allows Turnstile to complete its verification request", () => {
    expect(contentSecurityPolicy).toContain("connect-src 'self' https://*.supabase.co https://challenges.cloudflare.com");
  });

  it("does not enable dynamic script evaluation", () => {
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'");
  });
});
