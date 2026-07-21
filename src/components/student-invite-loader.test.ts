import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("student invite loader", () => {
  it("loads the interactive player only in the browser", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/student-invite-loader.tsx"), "utf8");
    expect(source).toContain('"use client"');
    expect(source).toContain("ssr: false");
  });

  it("uses the configured publishable Supabase key in the browser player", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/student-invite.tsx"), "utf8");
    expect(source).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(source).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });
});
