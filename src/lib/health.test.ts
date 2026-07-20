import { describe, expect, it } from "vitest";
import { healthStatus } from "./health";

describe("health status", () => {
  it("returns only safe observable fields with a correlation ID", () => {
    expect(healthStatus("req-123", new Date("2026-07-20T00:00:00Z"))).toEqual({ status: "ok", service: "clause", timestamp: "2026-07-20T00:00:00.000Z", requestId: "req-123" });
  });
});
