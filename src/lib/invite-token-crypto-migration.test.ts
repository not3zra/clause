import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("invite token crypto migration", () => {
  it("enables pgcrypto and uses its schema for secure invite tokens", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607210002_enable_invite_token_crypto.sql"), "utf8");
    expect(migration).toContain("create extension if not exists pgcrypto with schema extensions");
    expect(migration).toContain("extensions.gen_random_bytes(32)");
    expect(migration).toContain("extensions.digest(v_token, 'sha256')");
  });
});
