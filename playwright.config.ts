import { defineConfig } from "@playwright/test";

export default defineConfig({ testDir: "./e2e", use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : undefined }, webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: !process.env.CI }, reporter: "list" });
