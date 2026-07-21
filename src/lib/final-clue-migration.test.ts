import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("final clue board migration", () => {
  it("keeps final completion behind a sequence-validated session function", () => {
    const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/202607210003_final_clue_board_and_room_story.sql"), "utf8");
    expect(migration).toContain("create or replace function public.solve_session_mission_final_clue");
    expect(migration).toContain("p_selected_tokens <> v_expected");
    expect(migration).not.toContain("completed_at = case when p_credit_awarded");
  });
});
