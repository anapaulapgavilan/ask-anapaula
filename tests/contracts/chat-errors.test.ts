import { readFileSync, readdirSync } from "node:fs";
import { MockLanguageModelV4 } from "ai/test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compileKnowledge } from "../../scripts/build-knowledge";
import { parseEnvironment } from "../../src/lib/env-schema";
import type { RouteDependencies } from "../../src/app/api/chat/route";
import { handlePost } from "../../src/app/api/chat/route";

vi.mock("server-only", () => ({}));
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
beforeEach(() => vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test"));

const payload = {
  language: "en",
  messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "What did you study?" }] }],
};
const request = (body: unknown = payload) => new Request("https://example.test/api/chat", {
  method: "POST",
  headers: { origin: "https://example.test", "content-type": "application/json" },
  body: JSON.stringify(body),
});
const environment = parseEnvironment({
  CHAT_ENABLED: "true",
  ANTHROPIC_API_KEY: "synthetic-key",
  ANTHROPIC_MODEL: "synthetic-model",
  UPSTASH_REDIS_REST_URL: "https://redis.example.test",
  UPSTASH_REDIS_REST_TOKEN: "synthetic-token",
  IP_HASH_SECRET: "ab".repeat(32),
  NEXT_PUBLIC_CONTACT_EMAIL: "anapaulapgavilan@gmail.com",
  NEXT_PUBLIC_SITE_URL: "https://example.test",
  REDIS_KEY_PREFIX: "test:chat-errors",
});
const knowledge = compileKnowledge(Object.fromEntries(
  readdirSync("content").map((file) => [file, readFileSync(`content/${file}`, "utf8")]),
));
const model = new MockLanguageModelV4({
  doStream: async () => ({ stream: new ReadableStream() }),
});

function dependencies(): { calls: string[]; questions: unknown[][]; services: RouteDependencies } {
  const calls: string[] = [];
  const questions: unknown[][] = [];
  return {
    calls,
    questions,
    services: {
      getEnvironment: () => environment,
      getClientIp: () => { calls.push("identity"); return "192.0.2.1"; },
      claimAllowance: async () => {
        calls.push("allowance");
        return { allowed: true, remaining: 24, resetAt: Date.now() + 86400000, retryAfterSeconds: 0 };
      },
      persistQuestion: async (...args) => { calls.push("log"); questions.push(args); },
      getKnowledge: async () => { calls.push("knowledge"); return knowledge; },
      createModel: () => { calls.push("model"); return model; },
      createChatResponse: async () => {
        calls.push("generation");
        return new Response("mock stream", { headers: { "content-type": "text/event-stream" } });
      },
    },
  };
}

describe("chat route failure contract", () => {
  it("claims allowance and writes minimized question data before model generation", async () => {
    const { calls, questions, services } = dependencies();
    const response = await handlePost(request(), services);

    expect(response.status).toBe(200);
    expect(calls).toEqual(["identity", "allowance", "log", "knowledge", "model", "generation"]);
    expect(questions).toEqual([["What did you study?", "en", "192.0.2.1"]]);
  });

  it("fails closed when trusted visitor attribution is unavailable", async () => {
    const { calls, services } = dependencies();
    services.getClientIp = () => { throw new Error("Untrusted forwarding value"); };
    const response = await handlePost(request(), services);
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("VISITOR_ATTRIBUTION_UNAVAILABLE");
    expect(calls).toEqual([]);
  });

  it("returns Retry-After and localized contact information without logging or generation", async () => {
    const { calls, services } = dependencies();
    services.claimAllowance = async () => {
      calls.push("allowance");
      return { allowed: false, remaining: 0, resetAt: Date.now() + 37000, retryAfterSeconds: 37 };
    };
    const response = await handlePost(request({ ...payload, language: "es" }), services);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("37");
    expect(body.error.code).toBe("RATE_LIMITED");
    expect(body.error.message).toContain("37");
    expect(body.error.message).toContain("anapaulapgavilan@gmail.com");
    expect(body.error.contactUrl).toBe("mailto:anapaulapgavilan@gmail.com");
    expect(calls).toEqual(["identity", "allowance"]);
  });

  it("rejects limiter outages before question logging or generation", async () => {
    const { calls, services } = dependencies();
    services.claimAllowance = async () => {
      calls.push("allowance");
      throw new Error("PRIVATE_REDIS_DIAGNOSTIC");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handlePost(request(), services);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("RATE_LIMIT_UNAVAILABLE");
    expect(body).not.toContain("PRIVATE_REDIS_DIAGNOSTIC");
    expect(calls).toEqual(["identity", "allowance"]);
    expect(log).toHaveBeenCalledWith("RATE_LIMIT_UNAVAILABLE");
  });

  it("rejects logging outages after consuming the claim and before generation", async () => {
    const { calls, services } = dependencies();
    services.persistQuestion = async () => {
      calls.push("log");
      throw new Error("PRIVATE_LOG_DIAGNOSTIC");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handlePost(request(), services);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("QUESTION_LOG_UNAVAILABLE");
    expect(body).not.toContain("PRIVATE_LOG_DIAGNOSTIC");
    expect(calls).toEqual(["identity", "allowance", "log"]);
    expect(log).toHaveBeenCalledWith("QUESTION_LOG_UNAVAILABLE");
  });

  it("sanitizes model setup failures and never returns a success-shaped fallback", async () => {
    const { calls, services } = dependencies();
    services.createModel = () => {
      calls.push("model");
      throw new Error("PRIVATE_PROVIDER_DIAGNOSTIC");
    };
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await handlePost(request(), services);
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(body).toContain("CHAT_NOT_READY");
    expect(body).not.toContain("PRIVATE_PROVIDER_DIAGNOSTIC");
    expect(calls).toEqual(["identity", "allowance", "log", "knowledge", "model"]);
    expect(log).toHaveBeenCalledWith("CHAT_GENERATION_SETUP_FAILURE");
  });
});
