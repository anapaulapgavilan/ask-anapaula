import {
  convertToModelMessages, createUIMessageStream, createUIMessageStreamResponse,
  streamText, toUIMessageStream, type LanguageModel,
} from "ai";
import type { ChatRequest } from "./chat-schema";
import type { KnowledgeArtifact } from "./knowledge-schema";
import { buildSystemMessages } from "./system-prompt";
import { createAnswerFormatter, requestsDetail } from "./answer-format";
import { messages, replyLanguage } from "./i18n";

export async function createChatResponse(
  input: ChatRequest,
  knowledge: KnowledgeArtifact,
  model: LanguageModel,
  signal?: AbortSignal,
  deadlineMs = 45000,
) {
  const firstTurn = !input.messages.some((message) => message.role === "assistant");
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, deadlineMs);
  const cleanup = () => {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  };
  try {
    const latest = input.messages.at(-1);
    if (!latest) throw new Error("Missing validated latest message.");
    const language = replyLanguage(latest.parts[0].text, input.language);
    const converted = await convertToModelMessages(input.messages);
    const result = streamText({
      model,
      messages: [...buildSystemMessages(knowledge, language, firstTurn), ...converted],
      allowSystemInMessages: true,
      maxOutputTokens: 600,
      maxRetries: 0,
      abortSignal: controller.signal,
      providerOptions: { anthropic: { thinking: { type: "between_tools" } } },
      onError: () => console.error("CHAT_PROVIDER_FAILURE"),
    });
    const source = toUIMessageStream({
      stream: result.stream,
      sendReasoning: false,
      sendSources: false,
      onError: () => messages[language].unavailable,
    }).getReader();
    const formatter = createAnswerFormatter(language, firstTurn, requestsDetail(latest.parts[0].text));
    const stream = createUIMessageStream({
      onError: () => messages[language].unavailable,
      async execute({ writer }) {
        let failed = false;
        writer.write({ type: "start" });
        writer.write({ type: "text-start", id: "answer" });
        if (formatter.prefix) writer.write({ type: "text-delta", id: "answer", delta: formatter.prefix });
        try {
          while (true) {
            const { done, value } = await source.read();
            if (done) break;
            if (value.type === "error" || value.type === "abort") { failed = true; break; }
            if (value.type === "text-delta") {
              const delta = formatter.push(value.delta);
              if (delta) writer.write({ type: "text-delta", id: "answer", delta });
              if (formatter.limited) { controller.abort(); break; }
            }
          }
          if (controller.signal.aborted && !formatter.limited) failed = true;
          if (failed) writer.write({ type: "error", errorText: messages[language].unavailable });
          else writer.write({ type: "text-delta", id: "answer", delta: formatter.finish() });
          writer.write({ type: "text-end", id: "answer" });
          writer.write({ type: "finish" });
        } finally {
          controller.abort();
          await source.cancel();
          cleanup();
        }
      },
    });
    return createUIMessageStreamResponse({ stream, headers: { "Cache-Control": "no-store" } });
  } catch {
    cleanup();
    controller.abort();
    console.error("CHAT_STREAM_SETUP_FAILURE");
    throw new Error("CHAT_STREAM_SETUP_FAILURE");
  }
}
