import { describe, expect, it } from "vitest";
import { isPrivateDocumentPath, scanText } from "../../scripts/check-secrets";

describe("repository secret scan rules", () => {
  it("detects credential patterns without including their values in findings", () => {
    const token = ["ghp", "_", "A".repeat(36)].join("");
    const findings = scanText("src/config.ts", `const token = "${token}";`);

    expect(findings).toEqual([{ file: "src/config.ts", line: 1, rule: "github-token" }]);
    expect(JSON.stringify(findings)).not.toContain(token);
  });

  it("does not mistake runtime environment lookups for embedded credentials", () => {
    expect(scanText("src/lib/env.ts", "const apiKey = process.env.ANTHROPIC_API_KEY;")).toEqual([]);
  });

  it("does not join an empty credential assignment to text on the next line", () => {
    const text = `UPSTASH_REDIS_REST_TOKEN=\n${"A".repeat(32)}`;
    expect(scanText("README.md", text)).toEqual([]);
  });

  it("identifies tracked private document formats by path", () => {
    expect(isPrivateDocumentPath("public/private-profile.PDF")).toBe(true);
    expect(isPrivateDocumentPath("content/profile.md")).toBe(false);
  });
});
