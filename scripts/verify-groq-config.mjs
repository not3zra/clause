import { groqConfiguration } from "./groq-config.mjs";

try {
  const result = groqConfiguration(process.env);
  console.log(result.configured ? `Groq server configuration verified for ${result.model}.` : `Groq configuration missing: ${result.missing.join(", ")}`);
  if (!result.configured) process.exitCode = 1;
} catch (error) {
  console.error(`Groq configuration rejected: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}
