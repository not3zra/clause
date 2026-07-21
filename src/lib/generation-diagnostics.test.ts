import { describe, expect, it } from "vitest";
import { generationFailureCode, groqRetryDelaySeconds, providerFailureCode, providerFailureDetails, shouldRetryProviderFailure } from "./generation-diagnostics";

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

describe("provider failure classification", () => {
  it("classifies safe 400 categories without retaining the response message", () => {
    expect(providerFailureCode(400, "The response_format JSON schema is unsupported.")).toBe("provider_schema_rejected");
    expect(providerFailureCode(400, "The requested model is not supported.")).toBe("provider_model_rejected");
    expect(providerFailureCode(400, "Invalid request parameter: input.")).toBe("provider_input_rejected");
    expect(providerFailureCode(400, "Malformed request.")).toBe("provider_http_400");
    expect(providerFailureCode(401, "Invalid API key.")).toBe("provider_http_401");
  });

  it("retries only transient generic provider failures", () => {
    expect(shouldRetryProviderFailure(400, "provider_http_400")).toBe(true);
    expect(shouldRetryProviderFailure(503, "provider_http_503")).toBe(true);
    expect(shouldRetryProviderFailure(400, "provider_input_rejected")).toBe(false);
    expect(shouldRetryProviderFailure(400, "provider_schema_rejected")).toBe(false);
    expect(shouldRetryProviderFailure(429, "provider_http_429")).toBe(false);
  });

  it("keeps provider diagnostics safe while preserving actionable categories", () => {
    expect(providerFailureDetails({ error: { type: "invalid_request_error", code: "bad_request", message: "Request rejected because the account has exhausted its daily token quota." } })).toEqual({ type: "invalid_request_error", code: "bad_request", category: "quota_or_billing" });
    expect(providerFailureDetails({ error: { type: "unsafe value", code: "contains spaces", message: "Invalid request parameter: input." } })).toEqual({ category: "request_format" });
  });

  it("uses a bounded provider retry delay without retaining the provider message", () => {
    expect(groqRetryDelaySeconds("Please try again in 1.5s.")).toBe(1.5);
    expect(groqRetryDelaySeconds("Please try again in 90s.")).toBe(30);
    expect(groqRetryDelaySeconds("Rate limited.")).toBe(5);
  });
});
