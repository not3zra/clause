import { expect, test } from "@playwright/test";

test("public release surface has a healthy service and protected teacher entry", async ({ page, request }) => {
  const health = await request.get("/api/health", { headers: { "x-request-id": "e2e-release" } });
  expect(health.ok()).toBeTruthy();
  await expect(health.json()).resolves.toMatchObject({ status: "ok", service: "clause", requestId: "e2e-release" });
  await page.goto("/");
  await expect(page).toHaveTitle(/Clause/);
  await expect(page.getByText("Teacher access")).toHaveCount(0);
});
