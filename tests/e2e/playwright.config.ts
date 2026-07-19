import { defineConfig, devices } from "@playwright/test";

// Non-regression (TNR) E2E suite for the Smocker web UI. The same specs must pass against the
// pre-migration UI (React 16 / antd 4 / Parcel) and the post-migration UI (React 19 / antd / Vite),
// so assertions target stable, framework-agnostic content (visible text, data, URLs, SVG presence)
// rather than antd-specific DOM. Point at a running server via SMOCKER_E2E_URL.
export default defineConfig({
  testDir: ".",
  // Keep all generated output under the repo's build/ directory (never at the repo root).
  outputDir: "../../build/e2e/test-results",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: process.env.SMOCKER_E2E_URL || "http://localhost:18081",
    trace: "off",
    actionTimeout: 10_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
