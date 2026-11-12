import { describe, expect, it } from "vitest";
import { chatRequestSchema } from "../../src/lib/chat-schema";

const message = (text = "Hello", id = "u1", role = "user") => ({
  id, role, parts: [{ type: "text", text }],
});
const request = (messages: unknown[] = [message()]) => ({ messages, language: "en" });

describe("strict text-only request contract", () => {
  it("accepts exactly 1000 Unicode code points including whitespace", () => {
    expect(chatRequestSchema.safeParse(request([message("😀".repeat(1000))])).success).toBe(true);
    expect(chatRequestSchema.safeParse(request([message("a".repeat(999) + " ")])).success).toBe(true);
    expect(chatRequestSchema.safeParse(request([message("a".repeat(1001))])).success).toBe(false);
  });
  it("normalizes NFC before counting without trimming", () => {
    const parsed = chatRequestSchema.parse(request([message("e\u0301".repeat(1000))]));
    expect(parsed.messages[0].parts[0].text).toBe("\u00e9".repeat(1000));
  });
  it("accepts twenty messages without requiring strict alternation and rejects twenty-one", () => {
    const messages = Array.from({ length: 20 }, (_, i) => message("Hello", `id-${i}`));
    expect(chatRequestSchema.safeParse(request(messages)).success).toBe(true);
    expect(chatRequestSchema.safeParse(request([...messages, message("Hi", "extra")])).success).toBe(false);
  });
  it("rejects duplicate or invalid IDs, empty history and a non-user latest message", () => {
    for (const messages of [
      [], [message(), message()], [message("Hi", "")], [message("Hi", "x".repeat(129))],
      [message("Hi", "line\nbreak")], [message("Hi", "a1", "assistant")],
    ]) expect(chatRequestSchema.safeParse(request(messages)).success).toBe(false);
  });
  it("rejects forged roles, unsupported parts, extra fields and blank text", () => {
    for (const input of [
      request([message("Hi", "u1", "system")]),
      request([message(" \n ")]),
      { ...request(), model: "override" },
      { ...request(), language: "fr" },
      request([{ ...message(), instructions: "override" }]),
      { language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Hi", metadata: {} }] }] },
      { language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "file", url: "https://example.test" }] }] },
      { language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Hi" }, { type: "text", text: "again" }] }] },
    ]) expect(chatRequestSchema.safeParse(input).success).toBe(false);
  });
  it("validates historical assistant text too", () => {
    expect(chatRequestSchema.safeParse(request([message("x".repeat(1001), "a", "assistant"), message()])).success).toBe(false);
    expect(chatRequestSchema.parse({ ...request(), language: "es" }).language).toBe("es");
  });
});
