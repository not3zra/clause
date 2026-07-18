const REQUIRED_VARIABLES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
];

export function validateSupabaseConfig(environment) {
  const missing = REQUIRED_VARIABLES.filter((name) => !environment[name]?.trim());

  return {
    configured: missing.length === 0,
    missing,
  };
}

export async function verifySupabaseConnection(environment, fetchImplementation = fetch) {
  const config = validateSupabaseConfig(environment);

  if (!config.configured) {
    return config;
  }

  try {
    const response = await fetchImplementation(new URL("/rest/v1/", environment.NEXT_PUBLIC_SUPABASE_URL), {
      headers: {
        apikey: environment.SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${environment.SUPABASE_SECRET_KEY}`,
      },
    });

    return {
      configured: response.ok,
      missing: response.ok ? [] : ["SUPABASE_CONNECTION"],
    };
  } catch {
    return {
      configured: false,
      missing: ["SUPABASE_CONNECTION"],
    };
  }
}
