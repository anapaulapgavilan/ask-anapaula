import { chatRequestSchema } from "../../../lib/chat-schema";
import { APPROVED_CONTACT_EMAIL } from "../../../config/profile";
import { messages, type Language } from "../../../lib/i18n";

export const runtime = "nodejs";
export const maxDuration = 60;
const BODY_LIMIT = 131072;

function error(status: number, code: string, language: Language = "en") {
  const message = status === 400 ? messages[language].invalid : messages[language].unavailable;
  return Response.json({
    error: { code, message, contactUrl: `mailto:${APPROVED_CONTACT_EMAIL}` },
  }, { status, headers: { "Cache-Control": "no-store" } });
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;
export const OPTIONS = GET;
export const HEAD = GET;

export async function POST(request: Request) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return error(415, "UNSUPPORTED_MEDIA_TYPE");
  }
  const configuredOrigin = process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL
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
    const language = typeof input === "object" && input !== null && "language" in input && input.language === "es" ? "es" : "en";
    const code = parsed.error.issues.some((issue) => issue.message === "CONVERSATION_TOO_LONG")
      ? "CONVERSATION_TOO_LONG" : parsed.error.issues.some((issue) => issue.message === "MESSAGE_TOO_LONG")
        ? "MESSAGE_TOO_LONG" : "INVALID_REQUEST";
    return error(400, code, language);
  }
  // US2/US5 must wire identity, exact limits and successful logging before activation.
  return error(503, "CHAT_NOT_READY", parsed.data.language);
}
