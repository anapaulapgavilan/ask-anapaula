import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import { APPROVED_CONTACT_EMAIL } from "../../../config/profile";
import { chatRequestSchema, type ChatRequest } from "../../../lib/chat-schema";
import { getKnowledge } from "../../../lib/knowledge";
import type { KnowledgeArtifact } from "../../../lib/knowledge-schema";
import { messages, type Language } from "../../../lib/i18n";
import { persistQuestion } from "../../../lib/log";
import { trustedClientIp } from "../../../lib/network-identity";
import { claimRequestAllowance, type Allowance } from "../../../lib/rate-limit";
import { createChatResponse } from "../../../lib/chat-stream";
import { getServerEnvironment } from "../../../lib/env";
import { authMode, googleAuthConfigured } from "../../../lib/auth-policy";

export const runtime = "nodejs";
export const maxDuration = 60;
const BODY_LIMIT = 131072;

export type RouteDependencies = {
  getEnvironment: typeof getServerEnvironment;
  getClientIp: typeof trustedClientIp;
  claimAllowance: typeof claimRequestAllowance;
  persistQuestion: typeof persistQuestion;
  getKnowledge: typeof getKnowledge;
  createModel: (apiKey: string, modelId: string) => LanguageModel;
  createChatResponse: (
    input: ChatRequest,
    knowledge: KnowledgeArtifact,
    model: LanguageModel,
    signal: AbortSignal,
  ) => Promise<Response>;
};

const routeDependencies: RouteDependencies = {
  getEnvironment: getServerEnvironment,
  getClientIp: trustedClientIp,
  claimAllowance: claimRequestAllowance,
  persistQuestion,
  getKnowledge,
  createModel: (apiKey, modelId) => createAnthropic({ apiKey })(modelId),
  createChatResponse,
};

function error(
  status: number,
  code: string,
  language: Language = "en",
  retryAfterSeconds?: number,
) {
  const message = status === 400 ? messages[language].invalid
    : status === 429
      ? messages[language].rateLimited.replace("{seconds}", String(retryAfterSeconds ?? 1))
      : messages[language].unavailable;
  return Response.json({
    error: {
      code,
      message,
      contactUrl: `mailto:${APPROVED_CONTACT_EMAIL}`,
      ...(retryAfterSeconds === undefined ? {} : { retryAfterSeconds }),
    },
  }, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...(retryAfterSeconds === undefined ? {} : { "Retry-After": String(retryAfterSeconds) }),
    },
  });
}

function getLanguage(input: unknown): Language {
  return typeof input === "object" && input !== null && "language" in input && input.language === "es"
    ? "es"
    : "en";
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
export const HEAD = GET;

export async function handlePost(request: Request, dependencies: RouteDependencies = routeDependencies) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error(415, "UNSUPPORTED_MEDIA_TYPE");
  }
  const configuredOrigin = process.env.VERCEL_ENV === "preview" && process.env.AUTH_MODE === "google"
    ? process.env.AUTH_URL
    : process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}` : process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredOrigin) return error(503, "CHAT_NOT_READY");
  try {
    const origin = new URL(configuredOrigin);
    if (origin.protocol !== "https:" || origin.origin !== configuredOrigin) return error(503, "CHAT_NOT_READY");
    if (request.headers.get("origin") !== origin.origin) return error(403, "ORIGIN_NOT_ALLOWED");
  } catch {
    console.error("CHAT_ORIGIN_CONFIGURATION_INVALID");
    return error(503, "CHAT_NOT_READY");
  }
  const reader = request.body?.getReader();
  if (!reader) return error(400, "INVALID_REQUEST");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > BODY_LIMIT) { await reader.cancel(); return error(413, "PAYLOAD_TOO_LARGE"); }
      chunks.push(value);
    }
  } catch {
    console.error("CHAT_BODY_READ_FAILURE");
    return error(400, "INVALID_REQUEST");
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let input: unknown;
  try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { return error(400, "INVALID_REQUEST"); }
  const parsed = chatRequestSchema.safeParse(input);
  if (!parsed.success) {
    const language = getLanguage(input);
    const code = parsed.error.issues.some((issue) => issue.message === "CONVERSATION_TOO_LONG")
      ? "CONVERSATION_TOO_LONG" : parsed.error.issues.some((issue) => issue.message === "MESSAGE_TOO_LONG")
        ? "MESSAGE_TOO_LONG" : "INVALID_REQUEST";
    return error(400, code, language);
  }
  return runChat(request, parsed.data, dependencies);
}

async function runChat(request: Request, input: ChatRequest, dependencies: RouteDependencies): Promise<Response> {
  const language = input.language;
  let environment: ReturnType<typeof getServerEnvironment>;
  try {
    environment = dependencies.getEnvironment();
  } catch {
    console.error("CHAT_CONFIGURATION_UNAVAILABLE");
    return error(503, "CHAT_NOT_READY", language);
  }
  if (!environment.chatEnabled) return error(503, "CHAT_NOT_READY", language);

  let ip: string;
  try {
    ip = dependencies.getClientIp(request);
  } catch {
    console.error("CHAT_ATTRIBUTION_UNAVAILABLE");
    return error(503, "VISITOR_ATTRIBUTION_UNAVAILABLE", language);
  }

  let allowance: Allowance;
  try {
    allowance = await dependencies.claimAllowance(ip);
  } catch (cause) {
    if (!(cause instanceof Error && cause.message === "RATE_LIMIT_UNAVAILABLE")) {
      console.error("RATE_LIMIT_UNAVAILABLE");
    }
    return error(503, "RATE_LIMIT_UNAVAILABLE", language);
  }
  if (!allowance.allowed) {
    return error(429, "RATE_LIMITED", language, Math.max(1, allowance.retryAfterSeconds));
  }

  const question = input.messages.at(-1)?.parts[0].text;
  if (!question) return error(400, "INVALID_REQUEST", language);
  try {
    await dependencies.persistQuestion(question, language, ip);
  } catch (cause) {
    if (!(cause instanceof Error && cause.message === "QUESTION_LOG_WRITE_FAILED")) {
      console.error("QUESTION_LOG_UNAVAILABLE");
    }
    return error(503, "QUESTION_LOG_UNAVAILABLE", language);
  }

  try {
    const apiKey = environment.ANTHROPIC_API_KEY;
    const modelId = environment.ANTHROPIC_MODEL;
    if (!apiKey || !modelId) throw new Error("CHAT_PROVIDER_CONFIGURATION_INCOMPLETE");
    const knowledge = await dependencies.getKnowledge();
    const model = dependencies.createModel(apiKey, modelId);
    return await dependencies.createChatResponse(input, knowledge, model, request.signal);
  } catch {
    console.error("CHAT_GENERATION_SETUP_FAILURE");
    return error(503, "CHAT_NOT_READY", language);
  }
}

export async function POST(request: Request) {
  let mode: ReturnType<typeof authMode>;
  try {
    mode = authMode(process.env.AUTH_MODE, process.env.VERCEL_ENV);
  } catch {
    console.error("AUTH_MODE_INVALID");
    return error(503, "AUTH_CONFIGURATION_UNAVAILABLE");
  }
  if (mode === "google") {
    if (!googleAuthConfigured(process.env)) {
      console.error("AUTH_CONFIGURATION_UNAVAILABLE");
      return error(503, "AUTH_CONFIGURATION_UNAVAILABLE");
    }
    try {
      const { auth } = await import("../../../auth");
      if (!await auth()) return error(401, "AUTH_REQUIRED");
    } catch {
      console.error("AUTH_SESSION_UNAVAILABLE");
      return error(503, "AUTH_SESSION_UNAVAILABLE");
    }
  }
  return handlePost(request);
}
