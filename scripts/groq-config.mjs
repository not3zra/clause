const APPROVED_MODEL = "openai/gpt-oss-20b";

function positiveInteger(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("AI rate limits must be positive integers.");
  return parsed;
}

export function groqConfiguration(environment) {
  const model = environment.GROQ_MODEL || APPROVED_MODEL;
  if (model !== APPROVED_MODEL) throw new Error(`Model ${model} is not approved for this demo.`);
  return {
    configured: Boolean(environment.GROQ_API_KEY?.trim()),
    missing: environment.GROQ_API_KEY?.trim() ? [] : ["GROQ_API_KEY"],
    model,
    perStudentHourlyLimit: positiveInteger(environment.AI_MAX_REQUESTS_PER_STUDENT_PER_HOUR, 10),
    globalPerMinuteLimit: positiveInteger(environment.AI_MAX_REQUESTS_PER_MINUTE, 30),
  };
}
