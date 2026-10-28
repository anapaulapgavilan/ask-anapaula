import { defineConfig } from "@playwright/test";

const selected = process.argv
  .filter((argument) => argument.startsWith("--project="))
  .map((argument) => argument.slice("--project=".length));
const liveProjects = selected.filter((name) => name.startsWith("live-"));
if (liveProjects.length > 1 || (liveProjects.length && selected.includes("mocked"))) {
  throw new Error("Run each live acceptance environment separately.");
}
const live = liveProjects.length === 1;
const expectedTarget = liveProjects[0] === "live-production" ? "production" : "preview";
const target = process.env.E2E_TARGET_URL;
if (live) {
  if (process.env.CI || process.env.CODESPACES !== "true") {
    throw new Error("Live browser acceptance requires an explicit trusted Codespace run.");
  }
  if (
    !target ||
    new URL(target).protocol !== "https:" ||
    process.env.E2E_TARGET_ENV !== expectedTarget
  ) {
    throw new Error("Set E2E_TARGET_URL and the matching E2E_TARGET_ENV for live acceptance.");
  }
}
const liveMatch = /(?:content-publication|release)\.spec\.ts$/;

export default defineConfig({
  testDir: "./tests/e2e",
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: live ? target : "http://127.0.0.1:3000",
    trace: "off",
    screenshot: "off",
    video: "off",
  },
  projects: [
    { name: "mocked", testIgnore: liveMatch },
    {
      name: "live-preview",
      testMatch: /content-publication\.spec\.ts$/,
    },
    { name: "live-production", testMatch: liveMatch },
  ],
  webServer: live
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: false,
        timeout: 120_000,
      },
});
