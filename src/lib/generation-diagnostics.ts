type FailureInput = {
  configured?: boolean;
  upstreamStatus?: number;
  timedOut?: boolean;
  invalidResponse?: boolean;
};

export function generationFailureCode(input: FailureInput) {
  if (input.configured === false) return "config_missing";
  if (typeof input.upstreamStatus === "number")
    return `provider_http_${input.upstreamStatus}`;
  if (input.timedOut) return "provider_timeout";
  if (input.invalidResponse) return "provider_invalid_response";
  return "provider_request_failed";
}

export function providerFailureCode(status: number, message: unknown) {
  if (status !== 400 || typeof message !== "string")
    return generationFailureCode({ upstreamStatus: status });
  if (/json.?schema|response.?format|structured output/i.test(message))
    return "provider_schema_rejected";
  if (/\bmodel\b|decommissioned|unsupported model/i.test(message))
    return "provider_model_rejected";
  if (
    /invalid request|parameter|\binput\b|\bmessages?\b|\bcontent\b/i.test(
      message,
    )
  )
    return "provider_input_rejected";
  return "provider_http_400";
}

export function shouldRetryProviderFailure(status: number, code: string) {
  return status !== 429 && (code === "provider_http_400" || status >= 500);
}

export function groqRetryDelaySeconds(message: unknown) {
  const matched =
    typeof message === "string"
      ? message.match(/try again in ([\d.]+)s/i)
      : null;
  const seconds = matched ? Number(matched[1]) : 5;
  return Number.isFinite(seconds) && seconds > 0 ? Math.min(seconds, 30) : 5;
}

function safeProviderField(value: unknown) {
  return typeof value === "string" && /^[a-z0-9._-]{1,64}$/i.test(value)
    ? value
    : undefined;
}

export function providerFailureDetails(data: unknown) {
  const error = (
    data as {
      error?: { type?: unknown; code?: unknown; message?: unknown };
    } | null
  )?.error;
  const message = typeof error?.message === "string" ? error.message : "";
  const category = /quota|credit|billing|spend limit/i.test(message)
    ? "quota_or_billing"
    : /rate.?limit|too many requests/i.test(message)
      ? "rate_limited"
      : /safety|content policy|moderation/i.test(message)
        ? "safety_rejected"
        : /invalid request|parameter|\binput\b|response.?format|structured output/i.test(
              message,
            )
          ? "request_format"
          : "provider_rejection";
  return {
    ...(safeProviderField(error?.type)
      ? { type: safeProviderField(error?.type) }
      : {}),
    ...(safeProviderField(error?.code)
      ? { code: safeProviderField(error?.code) }
      : {}),
    category,
  };
}
