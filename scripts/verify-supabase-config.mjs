import { verifySupabaseConnection } from "./supabase-config.mjs";

const result = await verifySupabaseConnection(process.env);

if (result.configured) {
  console.log("Supabase configuration and Data API connection verified.");
} else {
  console.error(`Supabase verification failed: ${result.missing.join(", ")}`);
  process.exitCode = 1;
}
