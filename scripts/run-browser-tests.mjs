import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const allowed = new Set(["mocked", "live-preview", "live-production"]);
const selectors = args.filter((arg) => arg.startsWith("--project"));
if (selectors.some((arg) => !allowed.has(arg.slice("--project=".length)))) {
  throw new Error("Use --project=mocked, --project=live-preview, or --project=live-production.");
}
if (selectors.length > 1) {
  throw new Error("Select exactly one browser-test project.");
}
const result = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", ...args,
    ...(selectors.length ? [] : ["--project=mocked"])],
  { stdio: "inherit", env: process.env },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
