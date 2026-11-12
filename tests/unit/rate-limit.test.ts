import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { claimAllowance, RATE_LIMIT_SCRIPT, WINDOW_MS, type EvaluateAllowance } from "../../src/lib/rate-limit";

afterEach(() => vi.restoreAllMocks());
const input = { prefix: "integration:unit", limitId: "a".repeat(64) };
const now = 1800000000000;

describe("exact rolling allowance adapter", () => {
  it("uses Redis time, inclusive pruning and one unique server claim per attempt", async () => {
    const evaluate = vi.fn<EvaluateAllowance>(async () => [1, 24, now + WINDOW_MS, now]);
    const result = await claimAllowance(input, evaluate);
    await claimAllowance(input, evaluate);
    expect(result).toEqual({ allowed: true, remaining: 24, resetAt: now + WINDOW_MS, retryAfterSeconds: 0 });
    expect(evaluate).toHaveBeenCalledTimes(2);
    const [script, keys, args] = evaluate.mock.calls[0];
    expect(script).toBe(RATE_LIMIT_SCRIPT);
    expect(script).toContain("redis.call('TIME')");
    expect(script).toContain("'ZREMRANGEBYSCORE', key, '-inf', now - window");
    expect(keys).toEqual([`integration:unit:limit:v1:${input.limitId}`]);
    expect(args).toHaveLength(1);
    expect(args[0]).toMatch(/^[a-f0-9-]{36}$/);
    expect(evaluate.mock.calls[1]).not.toEqual(evaluate.mock.calls[0]);
    expect(script).not.toContain("ARGV[2]");
  });

  it.each([[1, 1], [1000, 1], [1001, 2], [WINDOW_MS, 86400]])("rounds %ims remaining to Retry-After %is", async (delay, seconds) => {
    const evaluate = vi.fn(async () => [0, 0, now + delay, now]);
    expect(await claimAllowance(input, evaluate)).toEqual({ allowed: false, remaining: 0, resetAt: now + delay, retryAfterSeconds: seconds });
    expect(evaluate).toHaveBeenCalledOnce();
  });

  it("has no refund, retry, local counter or clock after a storage failure", async () => {
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    const evaluate = vi.fn(async () => { throw new Error("PRIVATE_PROVIDER_DETAIL"); });
    await expect(claimAllowance(input, evaluate)).rejects.toThrow("RATE_LIMIT_UNAVAILABLE");
    expect(evaluate).toHaveBeenCalledOnce();
    expect(diagnostic).toHaveBeenCalledExactlyOnceWith("RATE_LIMIT_UNAVAILABLE");
  });

  it.each([
    null, [1, 25, now + WINDOW_MS, now], [0, 1, now + 1, now],
    [0, 0, now, now], [1, 24, now + WINDOW_MS + 1, now],
    [1, 24, now + WINDOW_MS, now, "extra"], ["1", 24, now + WINDOW_MS, now],
  ])("rejects malformed or inconsistent server replies: %j", async (reply) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(claimAllowance(input, async () => reply)).rejects.toThrow("RATE_LIMIT_UNAVAILABLE");
  });

  it("rejects unsafe keys before issuing any command", async () => {
    const evaluate = vi.fn(async () => [1, 24, now + WINDOW_MS, now]);
    await expect(claimAllowance({ ...input, prefix: "arbitrary" }, evaluate)).rejects.toThrow("RATE_LIMIT_CONFIGURATION_INVALID");
    await expect(claimAllowance({ ...input, limitId: "192.0.2.1" }, evaluate)).rejects.toThrow("RATE_LIMIT_CONFIGURATION_INVALID");
    expect(evaluate).not.toHaveBeenCalled();
  });
});
