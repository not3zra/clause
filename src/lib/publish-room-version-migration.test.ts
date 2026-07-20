import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("publish room version migration", () => {
  it("qualifies the room stage version column inside the publish function", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607210001_fix_publish_room_version_ambiguity.sql"), "utf8");
    expect(migration).toContain("public.room_stages.room_version_id = v_version.id");
  });
});
