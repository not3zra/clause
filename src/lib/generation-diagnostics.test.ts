import { describe, expect, it } from "vitest";
import { generationFailureCode } from "./generation-diagnostics";

describe("generation failure diagnostics", () => {
  it("uses safe codes without provider response details", () => {
    expect(generationFailureCode({ configured: false })).toBe("config_missing");
    expect(generationFailureCode({ upstreamStatus: 401 })).toBe("provider_http_401");
    expect(generationFailureCode({ upstreamStatus: 503 })).toBe("provider_http_503");
    expect(generationFailureCode({ timedOut: true })).toBe("provider_timeout");
    expect(generationFailureCode({ invalidResponse: true })).toBe("provider_invalid_response");
    expect(generationFailureCode({})).toBe("provider_request_failed");
  });
});
