import assert from "node:assert/strict";
import test from "node:test";
import {
  validateSupabaseConfig,
  verifySupabaseConnection,
} from "./supabase-config.mjs";

test("accepts a complete Supabase configuration without returning secret values", () => {
  const config = validateSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
    SUPABASE_SECRET_KEY: "sb_secret_example",
  });

  assert.deepEqual(config, {
    configured: true,
    missing: [],
  });
});

test("reports only missing variable names", () => {
  const config = validateSupabaseConfig({
    NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  });

  assert.deepEqual(config, {
    configured: false,
    missing: [
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "SUPABASE_SECRET_KEY",
    ],
  });
});

test("uses the server-only secret key for the configuration connection probe", async () => {
  let request;
  const config = await verifySupabaseConnection(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
      SUPABASE_SECRET_KEY: "sb_secret_example",
    },
    async (_url, options) => {
      request = options;
      return { ok: true };
    },
  );

  assert.deepEqual(config, { configured: true, missing: [] });
  assert.equal(request.headers.apikey, "sb_secret_example");
  assert.equal(request.headers.Authorization, "Bearer sb_secret_example");
});
