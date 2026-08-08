import { defineConfig } from "@playwright/test";

const baseURL = process.env.BASE_URL || "http://127.0.0.1:4173";
const useLocalServer = baseURL === "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  expect: {
    timeout: 8_000,
    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      scale: "css"
    }
  },
  forbidOnly: Boolean(process.env.CI),
  fullyParallel: true,
  reporter: [["list"], ["html", { open: "never" }]],
  retries: process.env.CI ? 1 : 0,
  snapshotPathTemplate: "{testDir}/visual/__screenshots__/{projectName}/{arg}{ext}",
  use: {
    baseURL,
    colorScheme: "dark",
    locale: "en-US",
    serviceWorkers: "block"
  },
  ...(useLocalServer ? {
    webServer: {
      command: "node tools/serve.mjs",
      port: 4173,
      reuseExistingServer: false,
      timeout: 15_000
    }
  } : {}),
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
