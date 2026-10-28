import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";
import { buildKnowledge } from "./build-knowledge";
import { buildSystemMessages } from "../src/lib/system-prompt";

export function assertTokenCeiling(count: number) {
  if (!Number.isInteger(count) || count < 0 || count >= 30000) throw new Error("Knowledge prefix must contain fewer than 30,000 provider-counted tokens.");
}
export async function checkTokens() {
  const key = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL;
  if (!key || !model) throw new Error("Token check BLOCKED: missing Anthropic key/model configuration.");
  const knowledge = await buildKnowledge();
  const prefix = buildSystemMessages(knowledge, "en", true).slice(0, 2).map((message) => ({
    type: "text", text: String(message.content),
  }));
  const response = await fetch("https://api.anthropic.com/v1/messages/count_tokens", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, system: prefix, messages: [{ role: "user", content: "Synthetic token-count check." }] }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`Token check failed: provider HTTP ${response.status}; response body suppressed.`);
  }
  const result = z.object({ input_tokens: z.number().int().nonnegative() }).parse(await response.json());
  assertTokenCeiling(result.input_tokens);
  console.log(`Provider token count PASS: ${result.input_tokens} tokens including a synthetic user envelope; revision ${knowledge.revision}. This is not a cache-hit or factual-readiness claim.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { await checkTokens(); }
  catch (error) {
    console.error(error instanceof Error && /^(Token check|Knowledge prefix)/.test(error.message) ? error.message : "TOKEN_CHECK_FAILED; diagnostics suppressed.");
    process.exitCode = 1;
  }
}
