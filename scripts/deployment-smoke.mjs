const target = process.env.SMOKE_URL;
if (!target) throw new Error("Set SMOKE_URL to the deployed Clause URL.");
const url = new URL("/api/health", target);
const response = await fetch(url, { headers: { "x-request-id": "deployment-smoke" } });
const payload = await response.json().catch(() => null);
if (!response.ok || payload?.status !== "ok" || payload?.service !== "clause") throw new Error(`Health check failed with HTTP ${response.status}.`);
const page = await fetch(target);
if (!page.ok) throw new Error(`Homepage failed with HTTP ${page.status}.`);
console.log(`Deployment smoke passed for ${url.origin}.`);
