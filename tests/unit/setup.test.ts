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

  it("provides the expected empty example variables", () => {
    const lines = readFileSync(".env.example", "utf8").trim().split(/\r?\n/);
    expect(lines).toEqual([
      "ANTHROPIC_API_KEY=",
      "ANTHROPIC_MODEL=",
      "UPSTASH_REDIS_REST_URL=",
      "UPSTASH_REDIS_REST_TOKEN=",
      "IP_HASH_SECRET=",
      "NEXT_PUBLIC_CONTACT_EMAIL=",
      "NEXT_PUBLIC_LINKEDIN_URL=",
      "NEXT_PUBLIC_SITE_URL=",
      "CHAT_ENABLED=",
      "REDIS_KEY_PREFIX=",
      "AUTH_MODE=",
      "AUTH_GOOGLE_ID=",
      "AUTH_GOOGLE_SECRET=",
      "AUTH_SECRET=",
      "AUTH_URL=",
    ]);
  });
});
