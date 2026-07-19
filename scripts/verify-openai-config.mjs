import { openAiConfiguration } from "./openai-config.mjs";

try {
  const result = openAiConfiguration(process.env);
  console.log(result.configured ? `OpenAI server configuration verified for ${result.model}.` : `OpenAI configuration missing: ${result.missing.join(", ")}`);
  if (!result.configured) process.exitCode = 1;
} catch (error) {
  console.error(`OpenAI configuration rejected: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
