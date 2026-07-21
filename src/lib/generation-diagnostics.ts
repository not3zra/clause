type FailureInput = {
  configured?: boolean;
  upstreamStatus?: number;
  timedOut?: boolean;
  invalidResponse?: boolean;
};

export function generationFailureCode(input: FailureInput) {
  if (input.configured === false) return "config_missing";
  if (typeof input.upstreamStatus === "number") return `provider_http_${input.upstreamStatus}`;
  if (input.timedOut) return "provider_timeout";
  if (input.invalidResponse) return "provider_invalid_response";
  return "provider_request_failed";
}

export function providerFailureCode(status: number, message: unknown) {
  if (status !== 400 || typeof message !== "string") return generationFailureCode({ upstreamStatus: status });
  if (/json.?schema|response.?format|structured output/i.test(message)) return "provider_schema_rejected";
  if (/\bmodel\b|decommissioned|unsupported model/i.test(message)) return "provider_model_rejected";
  if (/invalid request|parameter|\binput\b|\bmessages?\b|\bcontent\b/i.test(message)) return "provider_input_rejected";
  return "provider_http_400";
}

export function shouldRetryProviderFailure(status: number, code: string) {
  return status !== 429 && (code === "provider_http_400" || status >= 500);
}
