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
