import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { construct, evaluate } = vi.hoisted(() => ({ construct: vi.fn(), evaluate: vi.fn() }));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    eval = evaluate;
    constructor(options: unknown) { construct(options); }
  },
}));
import { parseEnvironment } from "../../src/lib/env-schema";
import { getRedisConnection } from "../../src/lib/redis";
import { claimRequestAllowance, WINDOW_MS } from "../../src/lib/rate-limit";
import { networkIds } from "../../src/lib/network-identity";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
const secret = "ab".repeat(32);

describe("Redis deployment isolation", () => {
  it.each([
    ["production", "production"],
    ["preview", "preview:reviewed-branch"],
    ["development", "integration:cloud"],
    [undefined, "test:unit"],
    [undefined, "integration:cloud"],
  ])("accepts explicit %s / %s mapping", (deployment, prefix) => {
    expect(parseEnvironment({ VERCEL_ENV: deployment, REDIS_KEY_PREFIX: prefix }).REDIS_KEY_PREFIX).toBe(prefix);
  });

  it.each([
    ["production", "integration:cloud"],
    ["production", "preview:branch"],
    ["production", "production:other"],
    ["preview", "production"],
    ["preview", "preview"],
    ["preview", "integration:cloud"],
    ["development", "production"],
    [undefined, "production"],
    [undefined, "preview:branch"],
    [undefined, "integration"],
    [undefined, "test"],
  ])("rejects cross-environment namespace %s / %s even with chat disabled", (deployment, prefix) => {
    expect(() => parseEnvironment({ VERCEL_ENV: deployment, REDIS_KEY_PREFIX: prefix })).toThrow("REDIS_KEY_PREFIX");
  });

  it("does not accept an unknown deployed environment", () => {
    expect(() => parseEnvironment({ VERCEL: "1", REDIS_KEY_PREFIX: "integration:cloud" })).toThrow("REDIS_KEY_PREFIX");
  });

  it("still permits secretless disabled builds and rejects incomplete runtime clients", () => {
    expect(parseEnvironment({ VERCEL_ENV: "production" }).chatEnabled).toBe(false);
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("REDIS_KEY_PREFIX", "");
    expect(() => getRedisConnection()).toThrow("REDIS_CONFIGURATION_INCOMPLETE");
    expect(construct).not.toHaveBeenCalled();
  });

  it("composes one zero-retry Redis claim with a canonical HMAC and no raw IP", async () => {
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("CHAT_ENABLED", "false");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example.test");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "synthetic-token");
    vi.stubEnv("REDIS_KEY_PREFIX", "integration:composition");
    vi.stubEnv("IP_HASH_SECRET", secret);
    const now = 1800000000000;
    evaluate.mockResolvedValue([1, 24, now + WINDOW_MS, now]);
    expect((await claimRequestAllowance("::ffff:192.0.2.1")).allowed).toBe(true);
    expect(construct).toHaveBeenCalledExactlyOnceWith({
      url: "https://example.test", token: "synthetic-token", retry: { retries: 0 },
    });
    expect(evaluate).toHaveBeenCalledOnce();
    const [, keys, args] = evaluate.mock.calls[0];
    expect(keys).toEqual([`integration:composition:limit:v1:${networkIds("192.0.2.1", secret).limitId}`]);
    expect(args).toHaveLength(1);
    expect(JSON.stringify(evaluate.mock.calls)).not.toContain("192.0.2.1");
    expect(JSON.stringify(evaluate.mock.calls)).not.toContain(secret);
  });
});
