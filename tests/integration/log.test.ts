import { randomUUID } from "node:crypto";
import { Redis } from "@upstash/redis";
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { logQuestion, questionRecordSchema } from "../../src/lib/log";
import { networkIds } from "../../src/lib/network-identity";

it("persists only allowed pseudonymous fields with real atomic TTL", async () => {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const secret = process.env.IP_HASH_SECRET;
  if (!url || !token || !secret) throw new Error("REDIS_LOG_CHECK_BLOCKED_MISSING_CREDENTIALS");
  const redis = new Redis({ url, token, retry: { retries: 0 } });
  const prefix = `integration:log-${randomUUID()}`;
  const keys: string[] = [];
  try {
    for (const question of ["What can I ask about?", "Jane Synthetic jane@example.test"]) {
      const key = await logQuestion({ question, language: "en", ip: "192.0.2.1", secret, prefix }, async (key, value, ttl) => {
        keys.push(key);
        expect(await redis.set(key, value, { ex: ttl })).toBe("OK");
      });
      const record = questionRecordSchema.parse(await redis.get(key));
      expect(Object.keys(record).sort()).toEqual(["ipHash", "language", "question", "timestamp"]);
      expect(record.question).toBe(question.startsWith("Jane") ? null : question);
      expect(record.ipHash).toBe(networkIds("192.0.2.1", secret).analyticsId);
      expect(record.ipHash).not.toBe(networkIds("192.0.2.1", secret).limitId);
      expect(JSON.stringify(record)).not.toMatch(/Jane|jane@|192\.0\.2\.1/);
      const ttl = await redis.ttl(key);
      expect(ttl).toBeGreaterThan(2591900);
      expect(ttl).toBeLessThanOrEqual(2592000);
    }
    const diagnostic = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(logQuestion({ question: "Synthetic only", language: "en", ip: "192.0.2.1", secret, prefix }, async (key, value) => {
        keys.push(key);
        await redis.set(key, value, { ex: 0 });
      })).rejects.toThrow("QUESTION_LOG_WRITE_FAILED");
      expect(diagnostic).toHaveBeenCalledWith("QUESTION_LOG_WRITE_FAILED");
    } finally { diagnostic.mockRestore(); }
  } finally {
    for (const key of keys) await redis.del(key);
  }
}, 30000);
