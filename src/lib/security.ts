type Fetcher = typeof fetch;

export function requestTooLarge(request: Request, maximumBytes = 16_384) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length > maximumBytes;
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function verifyTurnstile(token: unknown, remoteIp: string | null, environment = process.env, fetcher: Fetcher = fetch) {
  const secret = environment.TURNSTILE_SECRET_KEY;
  if (typeof token !== "string" || !token || !secret) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);
  try {
    const response = await fetcher("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    return response.ok && (await response.json() as { success?: boolean }).success === true;
  } catch { return false; }
}

export async function durableRateLimit(key: string, limit: number, windowSeconds: number, environment = process.env, fetcher: Fetcher = fetch) {
  const url = environment.UPSTASH_REDIS_REST_URL;
  const token = environment.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return { allowed: false, retryAfter: windowSeconds };
  try {
    const response = await fetcher(`${url.replace(/\/$/, "")}/eval/${encodeURIComponent("local n=redis.call('INCR',KEYS[1]);if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end;return n")}/1/${encodeURIComponent(key)}/${windowSeconds}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const payload = await response.json() as { result?: number };
    const count = Number(payload.result);
    return { allowed: response.ok && Number.isInteger(count) && count <= limit, retryAfter: windowSeconds };
  } catch { return { allowed: false, retryAfter: windowSeconds }; }
}

export async function anonymousRateLimitKey(request: Request, bucket: string) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return `${bucket}:${Buffer.from(digest).toString("hex")}`;
}
