export function deploymentUrl(environment) {
  const value = environment.DEMO_URL?.trim();
  if (!value) throw new Error("DEMO_URL is required.");
  let url;
  try { url = new URL(value); } catch { throw new Error("DEMO_URL must use http or https."); }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("DEMO_URL must use http or https.");
  return url.toString().replace(/\/$/, "");
}

if (process.argv[1]?.endsWith("demo-smoke.mjs")) {
  const url = deploymentUrl(process.env);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Demo root returned ${response.status}.`);
  const html = await response.text();
  if (!html.includes("CLAUSE")) throw new Error("Demo root did not render the Clause experience.");
  console.log(`Demo smoke passed: ${url}`);
}
