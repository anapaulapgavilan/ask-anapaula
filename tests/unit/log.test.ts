import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { canonicalIp, networkIds, trustedClientIp } from "../../src/lib/network-identity";
import { logQuestion, type QuestionRecord } from "../../src/lib/log";
import { selectSafeQuestion } from "../../src/config/question-catalog";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });
const secret = "ab".repeat(32);
describe("network identity", () => {
  it("normalizes IPv4/IPv6 aliases and separates HMAC domains", () => {
    expect(canonicalIp("::ffff:192.0.2.1")).toBe("192.0.2.1");
    expect(canonicalIp("2001:0db8:0:0:0:0:0:1")).toBe(canonicalIp("2001:db8::1"));
    const ids = networkIds("192.0.2.1", secret);
    expect(ids.limitId).toMatch(/^[a-f0-9]{64}$/);
    expect(ids.analyticsId).not.toBe(ids.limitId);
    expect(networkIds("::ffff:192.0.2.1", secret)).toEqual(ids);
    expect(() => networkIds("192.0.2.1", "weak")).toThrow(/configuration/);
    for (const ip of ["", "127.1", "192.0.2.1, 198.51.100.1", "bad", " 192.0.2.1"]) expect(() => canonicalIp(ip)).toThrow(/attribution/);
  });
  it("trusts only Vercel-controlled attribution inside the deployment boundary", () => {
    const request = new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "198.51.100.1" } });
    vi.stubEnv("VERCEL", "");
    expect(() => trustedClientIp(request)).toThrow(/attribution/);
    vi.stubEnv("VERCEL", "1");
    expect(trustedClientIp(request)).toBe("192.0.2.1");
    expect(() => trustedClientIp(new Request("https://example.test", { headers: { "x-forwarded-for": "198.51.100.1" } }))).toThrow(/attribution/);
  });
});
describe("minimized question records", () => {
  it("only keeps reviewed exact catalog matches, never arbitrary visitor text", () => {
    expect(selectSafeQuestion("  WHAT can I ask about?  ")).toBe("What can I ask about?");
    expect(selectSafeQuestion("Jane Synthetic, email jane@example.test, what can I ask about?")).toBeNull();
    expect(selectSafeQuestion("Cuentame de los proyectos.")).toBe("Cuentame de los proyectos.");
  });
  it("stores exactly four fields with domain-separated identity and thirty-day TTL", async () => {
    let saved: QuestionRecord | undefined;
    const write = vi.fn(async (_key: string, value: QuestionRecord, ttl: number) => {
      saved = value;
      expect(ttl).toBe(2592000);
    });
    const key = await logQuestion({
      question: "Jane Synthetic jane@example.test", language: "en", ip: "192.0.2.1",
      secret, prefix: "integration:synthetic",
    }, write);
    expect(key).toMatch(/^integration:synthetic:question:v1:[a-f0-9-]+$/);
    expect(Object.keys(saved ?? {}).sort()).toEqual(["ipHash", "language", "question", "timestamp"]);
    expect(saved?.question).toBeNull();
    expect(saved?.ipHash).toBe(networkIds("192.0.2.1", secret).analyticsId);
    expect(JSON.stringify(saved)).not.toMatch(/Jane|jane@|192\.0\.2\.1/);
    expect(write).toHaveBeenCalledOnce();
  });
  it("surfaces persistence failures using only an allowlisted operational code", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(logQuestion({
      question: "Jane Synthetic", language: "en", ip: "192.0.2.1", secret, prefix: "integration:synthetic",
    }, async () => { throw new Error("PRIVATE_DIAGNOSTIC"); })).rejects.toThrow("QUESTION_LOG_WRITE_FAILED");
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith("QUESTION_LOG_WRITE_FAILED");
  });
});
