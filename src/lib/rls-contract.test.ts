import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrations = readdirSync("supabase/migrations").filter((file) => file.endsWith(".sql")).map((file) => readFileSync(`supabase/migrations/${file}`, "utf8")).join("\n");

describe("tenant isolation RLS contract", () => {
  it("enables RLS and scopes teacher analytics records through the owning room", () => {
    expect(migrations).toContain("alter table public.mission_item_attempts enable row level security");
    expect(migrations).toContain("alter table public.mission_metrics_events enable row level security");
    expect(migrations).toContain('create policy "teachers can view item attempts for their rooms"');
    expect(migrations).toContain('create policy "teachers can view metrics for their rooms"');
    expect(migrations).toMatch(/r\.teacher_id = auth\.uid\(\)/);
  });

  it("does not grant service-role credentials to browser roles", () => {
    expect(migrations).toContain("grant all on public.mission_item_attempts, public.mission_metrics_events to service_role");
    expect(migrations).not.toContain("grant all on public.mission_item_attempts to authenticated");
  });
});
