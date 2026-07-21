import { describe, expect, it } from "vitest";
import { generationFailureCode, providerFailureCode } from "./generation-diagnostics";

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
});
