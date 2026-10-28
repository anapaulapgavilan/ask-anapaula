import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { controlledChatResponse } from "../fixtures/chat-stream";

describe("cloud setup", () => {
  it("uses the installed SDK to frame a controlled UI response", async () => {
    const response = controlledChatResponse("Controlled response.");
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const text = await response.text();
    expect(text).toContain('"type":"text-delta"');
    expect(text).toContain("Controlled response.");
    expect(text).toContain("[DONE]");
  });

  it("provides exactly ten empty example variables", () => {
    const lines = readFileSync(".env.example", "utf8").trim().split(/\r?\n/);
    expect(lines).toHaveLength(10);
    for (const line of lines) expect(line).toMatch(/^[A-Z_]+=$/);
  });
});
