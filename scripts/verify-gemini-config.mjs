import { geminiConfiguration } from "./gemini-config.mjs";

try {
  const result = geminiConfiguration(process.env);
  console.log(result.configured ? `Gemini server configuration verified for ${result.model}.` : `Gemini configuration missing: ${result.missing.join(", ")}`);
  if (!result.configured) process.exitCode = 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid Gemini configuration.");
  process.exitCode = 1;
}
