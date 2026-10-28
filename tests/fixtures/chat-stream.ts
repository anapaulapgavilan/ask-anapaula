import { createUIMessageStream, createUIMessageStreamResponse } from "ai";

export function controlledChatResponse(text: string): Response {
  const stream = createUIMessageStream({
    execute({ writer }) {
      writer.write({ type: "start", messageId: "controlled-answer" });
      writer.write({ type: "text-start", id: "controlled-text" });
      writer.write({ type: "text-delta", id: "controlled-text", delta: text });
      writer.write({ type: "text-end", id: "controlled-text" });
      writer.write({ type: "finish" });
    },
  });
  return createUIMessageStreamResponse({ stream });
}
