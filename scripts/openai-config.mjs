const APPROVED_MODEL = "gpt-5-mini";
const defaultPerStudentHourlyLimit = 10;
const defaultGlobalPerMinuteLimit = 30;

function positiveInteger(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error("AI rate limits must be positive integers.");
  return parsed;
}

export function openAiConfiguration(environment) {
  const model = environment.OPENAI_MODEL || APPROVED_MODEL;
  if (model !== APPROVED_MODEL) throw new Error(`Model ${model} is not approved for this demo.`);
  return {
    configured: Boolean(environment.OPENAI_API_KEY?.trim()),
    missing: environment.OPENAI_API_KEY?.trim() ? [] : ["OPENAI_API_KEY"],
    model,
    perStudentHourlyLimit: positiveInteger(environment.AI_MAX_REQUESTS_PER_STUDENT_PER_HOUR, defaultPerStudentHourlyLimit),
    globalPerMinuteLimit: positiveInteger(environment.AI_MAX_REQUESTS_PER_MINUTE, defaultGlobalPerMinuteLimit),
  };
}
