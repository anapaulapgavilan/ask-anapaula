import { readFileSync, readdirSync } from "node:fs";
import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createChatResponse } from "../../src/lib/chat-stream";
import { compileKnowledge } from "../../scripts/build-knowledge";
import { chatRequestSchema } from "../../src/lib/chat-schema";
import { messages } from "../../src/lib/i18n";
import { countWords } from "../../src/lib/answer-format";

afterEach(() => vi.restoreAllMocks());
const knowledge = compileKnowledge(Object.fromEntries(readdirSync("content").map((file) => [file, readFileSync(`content/${file}`, "utf8")])));
const input = chatRequestSchema.parse({ language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "What is missing?" }] }] });
const usage = { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 5, text: 5, reasoning: 0 } };
function modelWithText(text: string) {
  return new MockLanguageModelV4({
    doStream: async () => ({
      stream: simulateReadableStream({
        initialDelayInMs: null, chunkDelayInMs: null,
        chunks: [
          { type: "stream-start", warnings: [] },
          { type: "reasoning-start", id: "r" },
          { type: "reasoning-delta", id: "r", delta: "PRIVATE_REASONING" },
          { type: "reasoning-end", id: "r" },
          { type: "text-start", id: "t" },
          { type: "text-delta", id: "t", delta: text },
          { type: "text-end", id: "t" },
          { type: "finish", finishReason: { unified: "length", raw: "max_tokens" }, usage },
        ],
      }),
    }),
  });
}
function visible(wire: string) {
  return wire.split("\n").filter((line) => line.startsWith("data: {")).flatMap((line) => {
    const chunk: unknown = JSON.parse(line.slice(6));
    return typeof chunk === "object" && chunk !== null && "type" in chunk && chunk.type === "text-delta" &&
      "delta" in chunk && typeof chunk.delta === "string" ? [chunk.delta] : [];
  }).join("");
}
describe("installed SDK stream adapter", () => {
  it("uses typed conversion, real SDK framing, bounded tokens and no reasoning exposure", async () => {
    const model = modelWithText("A complete synthetic sentence. An unfinished tail");
    const response = await createChatResponse(input, knowledge, model);
    const wire = await response.text();
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(wire).toContain("[DONE]");
    expect(wire).not.toContain("PRIVATE_REASONING");
    expect(wire).not.toContain("unfinished tail");
    expect(visible(wire)).toContain(messages.en.contact);
    expect(model.doStreamCalls[0].maxOutputTokens).toBe(600);
    expect(model.doStreamCalls[0].prompt.at(-1)?.role).toBe("user");
    expect(model.doStreamCalls[0].tools).toBeUndefined();
  });
  it("finishes an ordinary over-budget answer successfully at the last whole sentence", async () => {
    const model = modelWithText(`A complete sentence. ${Array(160).fill("word").join(" ")}. `);
    const wire = await (await createChatResponse(input, knowledge, model)).text();
    expect(visible(wire)).toContain("A complete sentence.");
    expect(visible(wire)).not.toContain("word");
    expect(wire).not.toContain('"type":"error"');
    expect(countWords(visible(wire))).toBeLessThanOrEqual(150);
  });
  it("sanitizes provider failures without a success-shaped contact fallback", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const model = new MockLanguageModelV4({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "t" },
            { type: "text-delta", id: "t", delta: "A partial complete sentence. unfinished" },
            { type: "error", error: new Error("PRIVATE_PROVIDER_DIAGNOSTIC") },
          ],
          initialDelayInMs: null, chunkDelayInMs: null,
        }),
      }),
    });
    const wire = await (await createChatResponse(input, knowledge, model)).text();
    expect(wire).toContain('"type":"error"');
    expect(wire).not.toContain("PRIVATE_PROVIDER_DIAGNOSTIC");
    expect(visible(wire)).not.toContain(messages.en.incomplete);
    expect(diagnostic).toHaveBeenCalledWith("CHAT_PROVIDER_FAILURE");
  });
  it("propagates deadline and client stop to a hanging provider and ends framing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    for (const stopped of [false, true]) {
      const controller = new AbortController();
      let providerSignal: AbortSignal | undefined;
      const model = new MockLanguageModelV4({
        doStream: async (options) => {
          providerSignal = options.abortSignal;
          return {
            stream: new ReadableStream({
              start(stream) {
                stream.enqueue({ type: "stream-start", warnings: [] });
                const terminate = () => stream.error(new DOMException("Aborted", "AbortError"));
                if (options.abortSignal?.aborted) terminate();
                else options.abortSignal?.addEventListener("abort", terminate, { once: true });
              },
            }),
          };
        },
      });
      const response = await createChatResponse(input, knowledge, model, controller.signal, 30);
      const body = response.text();
      if (stopped) controller.abort();
      const wire = await body;
      expect(providerSignal?.aborted).toBe(true);
      expect(wire).toContain('"type":"error"');
      expect(wire).toContain("[DONE]");
    }
  });
});
