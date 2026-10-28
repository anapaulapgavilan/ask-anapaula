import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { POST, GET } from "../../src/app/api/chat/route";

afterEach(() => vi.unstubAllEnvs());
const payload = { language: "en", messages: [{ id: "u", role: "user", parts: [{ type: "text", text: "Hello" }] }] };
const request = (body: unknown = payload, headers: HeadersInit = {}) => new Request("https://example.test/api/chat", {
  method: "POST",
  headers: { origin: "https://example.test", "content-type": "application/json", ...headers },
  body: JSON.stringify(body),
});
describe("bounded disabled endpoint", () => {
  it("rejects methods, media and forged origins before any generation", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    expect(GET().status).toBe(405);
    expect(GET().headers.get("allow")).toBe("POST");
    expect((await POST(request(payload, { "content-type": "text/plain" }))).status).toBe(415);
    expect((await POST(request(payload, { origin: "https://attacker.test" }))).status).toBe(403);
    expect((await POST(request(payload, { origin: "null" }))).status).toBe(403);
  });
  it("rejects roles, forged options and malformed JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    expect((await POST(request({ ...payload, model: "override" }))).status).toBe(400);
    expect((await POST(request({ ...payload, messages: [{ ...payload.messages[0], role: "system" }] }))).status).toBe(400);
    const malformed = new Request("https://example.test/api/chat", { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: "{" });
    expect((await POST(malformed)).status).toBe(400);
  });
  it("rejects a chunked body over 128 KiB without trusting Content-Length", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    const stream = new ReadableStream({ start(c) { c.enqueue(new Uint8Array(100000)); c.enqueue(new Uint8Array(40000)); c.close(); } });
    const init = { method: "POST", headers: { origin: "https://example.test", "content-type": "application/json" }, body: stream, duplex: "half" };
    const response = await POST(new Request("https://example.test/api/chat", init));
    expect(response.status).toBe(413);
  });
  it("stays disabled even if CHAT_ENABLED is prematurely set true", async () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.test");
    vi.stubEnv("CHAT_ENABLED", "true");
    const response = await POST(request());
    expect(response.status).toBe(503);
    expect(await response.text()).toContain("CHAT_NOT_READY");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
