import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { claimAllowance, RATE_LIMIT_SCRIPT, WINDOW_MS } from "../../src/lib/rate-limit";
import { withSyntheticClock } from "../fixtures/rate-limit";

it("enforces concurrent claims, individual boundaries and expiry on isolated real Redis", async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("REDIS_LIMIT_CHECK_BLOCKED_MISSING_CREDENTIALS");
  const redis = new Redis({ url, token, retry: { retries: 0 } });
  const prefix = `integration:limit-${randomUUID()}`;
  const limitId = "a".repeat(64);
  const key = `${prefix}:limit:v1:${limitId}`;
  const otherKey = `${prefix}:other:limit:v1:${limitId}`;
  const evaluate = (script: string, keys: string[], args: string[]) => redis.eval(script, keys, args);
  const claim = () => claimAllowance({ prefix, limitId }, evaluate);
  try {
    const before = Date.now();
    const results = await Promise.all(Array.from({ length: 40 }, claim));
    const after = Date.now();
    expect(results.filter((result) => result.allowed)).toHaveLength(25);
    expect(results.filter((result) => !result.allowed)).toHaveLength(15);
    expect(await redis.zcard(key)).toBe(25);
    const oldest = Number((await redis.zrange(key, 0, 0, { withScores: true }))[1]);
    expect(oldest).toBeGreaterThanOrEqual(before - 5000);
    expect(oldest).toBeLessThanOrEqual(after + 5000);
    const ttl = await redis.pttl(key);
    expect(ttl).toBeGreaterThan(WINDOW_MS - 30000);
    expect(ttl).toBeLessThanOrEqual(WINDOW_MS);

    // A shortened test TTL makes an accidental rejection refresh observable.
    await redis.pexpire(key, 20000);
    const ttlBefore = await redis.pttl(key);
    expect((await claim()).allowed).toBe(false);
    expect(await redis.pttl(key)).toBeLessThanOrEqual(ttlBefore);
    expect(await redis.zcard(key)).toBe(25);
    const isolated = await claimAllowance({ prefix: `${prefix}:other`, limitId }, evaluate);
    expect(isolated.allowed).toBe(true);

    await redis.del(key);
    const base = Date.now();
    const controlledClaim = (clock: number) => claimAllowance({ prefix, limitId }, (script, keys, args) =>
      redis.eval(withSyntheticClock(script, clock, keys), keys, args));
    const first = await controlledClaim(base);
    expect(first.allowed).toBe(true);
    for (let n = 1; n < 25; n++) expect((await controlledClaim(base + n * 1000)).allowed).toBe(true);
    expect((await controlledClaim(base + WINDOW_MS - 1)).retryAfterSeconds).toBe(1);
    expect((await controlledClaim(base + WINDOW_MS)).allowed).toBe(true);
    expect(await redis.zcard(key)).toBe(25);
    expect((await controlledClaim(base + WINDOW_MS)).allowed).toBe(false);
    expect((await controlledClaim(base + WINDOW_MS + 999)).retryAfterSeconds).toBe(1);
    expect((await controlledClaim(base + WINDOW_MS + 1000)).allowed).toBe(true);
    expect(await redis.zcard(key)).toBe(25);
    expect(await redis.pttl(key)).toBeGreaterThan(WINDOW_MS - 30000);

    // Failed or stopped generation has no refund operation: its claim remains.
    expect((await controlledClaim(base + WINDOW_MS + 1000)).allowed).toBe(false);
    expect(await redis.zcard(key)).toBe(25);
    const fullyExpired = await controlledClaim(base + 2 * WINDOW_MS + 1000);
    expect(fullyExpired).toMatchObject({ allowed: true, remaining: 24 });
    await redis.pexpire(key, 1);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await redis.exists(key)).toBe(0);
    expect((await controlledClaim(base + WINDOW_MS + 1000)).allowed).toBe(true);

    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await redis.del(key);
      await redis.set(key, "synthetic-wrong-type");
      await expect(claim()).rejects.toThrow("RATE_LIMIT_UNAVAILABLE");
      expect(diagnostic).toHaveBeenCalledWith("RATE_LIMIT_UNAVAILABLE");
    } finally { diagnostic.mockRestore(); }
    expect(() => withSyntheticClock(RATE_LIMIT_SCRIPT, base, ["production:limit:v1:test"])).toThrow();
  } finally {
    await redis.del(key, otherKey);
  }
}, 60000);
