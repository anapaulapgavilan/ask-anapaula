import { createAnthropic } from "@ai-sdk/anthropic";
import { readFileSync, readdirSync } from "node:fs";
import { streamText } from "ai";
import { expect, it } from "vitest";
import { createChatResponse } from "../../src/lib/chat-stream";
import { buildKnowledge, compileKnowledge } from "../../scripts/build-knowledge";
import { buildSystemMessages } from "../../src/lib/system-prompt";
import { chatRequestSchema } from "../../src/lib/chat-schema";
import { messages, type Language } from "../../src/lib/i18n";
import { countWords } from "../../src/lib/answer-format";

it("verifies real bilingual streams and reports actual repeated-prefix cache usage", async () => {
  const key = process.env.ANTHROPIC_API_KEY;
  const modelId = process.env.ANTHROPIC_MODEL;
  if (!key || !modelId) throw new Error("LIVE_SMOKE_BLOCKED_MISSING_CREDENTIALS");
  const model = createAnthropic({ apiKey: key })(modelId);
  const knowledge = await buildKnowledge();
  for (const language of ["en", "es"] satisfies Language[]) {
    const text = language === "en" ? "What is my favorite fictional constellation? Answer in English." : "\u00bfCual es mi constelacion ficticia favorita? Responde en espanol.";
    const input = chatRequestSchema.parse({ language: language === "en" ? "es" : "en", messages: [{ id: `synthetic-${language}`, role: "user", parts: [{ type: "text", text }] }] });
    const response = await createChatResponse(input, knowledge, model);
    const wire = await response.text();
    const chunks: unknown[] = wire.split("\n").filter((line) => line.startsWith("data: {")).map((line) => JSON.parse(line.slice(6)));
    const output = chunks.flatMap((chunk) => {
      if (typeof chunk !== "object" || chunk === null || !("type" in chunk)) return [];
      if (chunk.type === "error") throw new Error("LIVE_SMOKE_PROVIDER_STREAM_FAILED");
      return chunk.type === "text-delta" && "delta" in chunk && typeof chunk.delta === "string" ? [chunk.delta] : [];
    }).join("");
    expect(output).toContain(messages[language].disclosure);
    expect(output).toContain(messages[language].contact);
    expect(output).not.toContain(messages[language].incomplete);
    expect(output).toMatch(language === "en" ? /(?:don't|do not|not have|no information|not available|not included)/i : /(?:no (?:tengo|dispongo|cuento|hay)|no est[a\u00e1]|informaci[o\u00f3]n disponible)/i);
    expect(countWords(output)).toBeLessThanOrEqual(150);
    expect(wire).not.toContain("reasoning-delta");
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    // A test-only fact never enters the public content or generated release artifact.
    if (attempt === 0) {
      const sources = Object.fromEntries(readdirSync("content").map((file) => [file, readFileSync(`content/${file}`, "utf8")]));
      sources["03-projects.md"] = "# Synthetic fixture\n\n## Demonstration\n<!-- status:approved -->\nThis is only a synthetic test fixture, not a real claim about Ana Paula. Its demonstration project is named Cobalt.\n";
      const synthetic = compileKnowledge(sources);
      const input = chatRequestSchema.parse({ language: "en", messages: [{ id: "supported-fixture", role: "user", parts: [{ type: "text", text: "What is the demonstration project called in the synthetic approved evidence? State that it is only a test fixture." }] }] });
      const wire = await (await createChatResponse(input, synthetic, model)).text();
      expect(wire).toContain("Cobalt");
      expect(wire).not.toContain('"type":"error"');
    }
    const result = streamText({
      model, allowSystemInMessages: true,
      messages: [...buildSystemMessages(knowledge, "en", false), { role: "user", content: "Synthetic check: what information is missing?" }],
      maxOutputTokens: 600, maxRetries: 0, timeout: 45000,
      providerOptions: { anthropic: { thinking: { type: "between_tools" } } },
      onError: () => console.error("LIVE_CACHE_CHECK_PROVIDER_FAILURE"),
    });
    try {
      await result.text;
      const usage = await result.totalUsage;
      console.log(`Cache check ${attempt + 1}: read=${usage.inputTokenDetails.cacheReadTokens ?? 0}; write=${usage.inputTokenDetails.cacheWriteTokens ?? 0}. Zero read/write means uncached, not a cache pass.`);
    } catch { throw new Error("LIVE_CACHE_CHECK_FAILED; provider diagnostics suppressed."); }
  }
  for (const stopped of [false, true]) {
    const controller = new AbortController();
    const input = chatRequestSchema.parse({ language: "en", messages: [{ id: "abort-check", role: "user", parts: [{ type: "text", text: "What approved information is missing?" }] }] });
    const response = await createChatResponse(input, knowledge, model, controller.signal, stopped ? 45000 : 100);
    const timer = stopped ? setTimeout(() => controller.abort(), 100) : undefined;
    try {
      const wire = await response.text();
      expect(wire).toContain('"type":"error"');
      expect(wire).toContain("[DONE]");
      expect(wire).not.toContain("reasoning-delta");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}, 180000);
