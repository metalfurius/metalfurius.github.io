import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
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
    baseURL: "http://127.0.0.1:4173",
    colorScheme: "dark",
    locale: "en-US",
    serviceWorkers: "block"
  },
  webServer: {
    command: "node tools/serve.mjs",
    port: 4173,
    reuseExistingServer: false,
    timeout: 15_000
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
