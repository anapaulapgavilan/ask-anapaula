import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __chatRequests: unknown[];
    __chatAborts: number;
    __copiedText: string | null;
    __copyFailure: boolean;
    __setCopyFailure: (value: boolean) => void;
    __chatFailure: boolean;
    __setChatFailure: (value: boolean) => void;
    __chatRateLimited: boolean;
    __setChatRateLimited: (value: boolean) => void;
    __chatPartialFailure: boolean;
    __setChatPartialFailure: (value: boolean) => void;
  }
}

export async function installChatMock(page: Page, delay = 180, chunks = ["This is a mocked, approved-profile answer."]) {
  await page.addInitScript(({ chunkDelay, chunks }: { chunkDelay: number; chunks: string[] }) => {
    const state = window;
    state.__chatRequests = [];
    state.__chatAborts = 0;
    state.__copiedText = null;
    state.__copyFailure = false;
    state.__chatFailure = false;
    state.__chatRateLimited = false;
    state.__chatPartialFailure = false;
    state.__setCopyFailure = (value) => { state.__copyFailure = value; };
    state.__setChatFailure = (value) => { state.__chatFailure = value; };
    state.__setChatRateLimited = (value) => { state.__chatRateLimited = value; };
    state.__setChatPartialFailure = (value) => { state.__chatPartialFailure = value; };
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: async (text: string) => {
        if (state.__copyFailure) throw new DOMException("Clipboard unavailable", "NotAllowedError");
        state.__copiedText = text;
      } },
    });
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" || input instanceof URL ? input.toString() : input.url;
      if (new URL(url, location.href).pathname !== "/api/chat") return originalFetch(input, init);
      state.__chatRequests.push(JSON.parse(String(init?.body ?? "{}")) as unknown);
      if (state.__chatFailure) {
        return Response.json({
          error: {
            code: "CHAT_NOT_READY",
            message: "Chat is not available yet.",
            contactUrl: "mailto:anapaulapgavilan@gmail.com",
          },
        }, { status: 503 });
      }
      if (state.__chatRateLimited) {
        const language = (state.__chatRequests.at(-1) as { language?: string } | undefined)?.language;
        const message = language === "es"
          ? "Se alcanzó el límite diario. Inténtalo de nuevo en 37 segundos o contacta a Ana Paula en anapaulapgavilan@gmail.com."
          : "The daily request limit was reached. Try again in 37 seconds or contact Ana Paula at anapaulapgavilan@gmail.com.";
        return Response.json({
          error: {
            code: "RATE_LIMITED",
            message,
            contactUrl: "mailto:anapaulapgavilan@gmail.com",
            retryAfterSeconds: 37,
          },
        }, { status: 429, headers: { "retry-after": "37" } });
      }
      const signal = init?.signal;
      const encoder = new TextEncoder();
      let index = 0;
      const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          if (signal?.aborted) {
            state.__chatAborts++;
            controller.close();
            return;
          }
          const frames = state.__chatPartialFailure
            ? [
                { type: "start", messageId: `mock-${state.__chatRequests.length}` },
                { type: "text-start", id: "mock-text" },
                { type: "text-delta", id: "mock-text", delta: "This is a partial answer." },
                { type: "error", errorText: "The stream ended unexpectedly." },
                { type: "text-end", id: "mock-text" },
                { type: "finish" },
                "[DONE]",
              ]
            : [
                { type: "start", messageId: `mock-${state.__chatRequests.length}` },
                { type: "text-start", id: "mock-text" },
                ...chunks.map((delta) => ({ type: "text-delta", id: "mock-text", delta })),
                { type: "text-end", id: "mock-text" },
                { type: "finish" },
                "[DONE]",
              ];
          if (index >= frames.length) {
            controller.close();
            return;
          }
          if (index >= 2 && index < frames.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, chunkDelay));
            if (signal?.aborted) {
              state.__chatAborts++;
              controller.close();
              return;
            }
          }
          const next = frames[index++];
          controller.enqueue(encoder.encode(typeof next === "string" ? `data: ${next}\n\n` : frame(next)));
        },
        cancel() {
          state.__chatAborts++;
        },
      });
      return new Response(stream, {
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-vercel-ai-ui-message-stream": "v1",
        },
      });
    };
  }, { chunkDelay: delay, chunks });
}

export async function chatRequests(page: Page): Promise<unknown[]> {
  return page.evaluate(() => window.__chatRequests);
}

export async function abortCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__chatAborts);
}
