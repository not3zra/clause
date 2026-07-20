import { describe, expect, it, vi } from "vitest";
import { durableRateLimit, requestTooLarge, sameOrigin, verifyTurnstile } from "./security";

describe("security boundary", () => {
  it("rejects cross-origin and oversized browser writes", () => {
    expect(sameOrigin(new Request("https://clause.test/api", { headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(requestTooLarge(new Request("https://clause.test/api", { headers: { "content-length": "16385" } }))).toBe(true);
  });
  it("fails closed when Turnstile is absent or rejects the token", async () => {
    expect(await verifyTurnstile("token", null, {}, vi.fn())).toBe(false);
    expect(await verifyTurnstile("token", null, { TURNSTILE_SECRET_KEY: "secret" }, vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false }))))).toBe(false);
  });
  it("uses a durable atomic Redis counter and fails closed if unconfigured", async () => {
    expect((await durableRateLimit("rate:test", 2, 60, {}, vi.fn())).allowed).toBe(false);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ result: 3 })));
    expect((await durableRateLimit("rate:test", 2, 60, { UPSTASH_REDIS_REST_URL: "https://redis.test", UPSTASH_REDIS_REST_TOKEN: "token" }, fetcher)).allowed).toBe(false);
    expect(fetcher.mock.calls[0][0]).toContain("/eval/");
  });
});
