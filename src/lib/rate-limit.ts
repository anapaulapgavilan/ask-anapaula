import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getRedisConnection } from "./redis";
import { redisPrefixSchema } from "./env-schema";
import { getServerEnvironment } from "./env";
import { networkIds } from "./network-identity";

export const WINDOW_MS = 86400000;
export const RATE_LIMIT_CLOCK = `local clock = redis.call('TIME')
local now = tonumber(clock[1]) * 1000 + math.floor(tonumber(clock[2]) / 1000)`;
export const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
${RATE_LIMIT_CLOCK}
local window = 86400000
redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
if count >= 25 then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  return {0, 0, tonumber(oldest[2]) + window, now}
end
local added = redis.call('ZADD', key, 'NX', now, ARGV[1])
if added ~= 1 then
  return redis.error_reply('RATE_LIMIT_DUPLICATE_CLAIM')
end
redis.call('EXPIRE', key, 86400)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
return {1, 24 - count, tonumber(oldest[2]) + window, now}
`;

const claimSchema = z.object({
  prefix: redisPrefixSchema,
  limitId: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
const replySchema = z.tuple([
  z.union([z.literal(0), z.literal(1)]),
  z.number().int().min(0).max(24),
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
]).superRefine(([allowed, remaining, reset, now], context) => {
  if ((!allowed && remaining !== 0) || reset <= now || reset - now > WINDOW_MS) {
    context.addIssue({ code: "custom", message: "Invalid allowance reply." });
  }
});
export type Allowance = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};
export type EvaluateAllowance = (script: string, keys: string[], args: string[]) => Promise<unknown>;

export async function claimAllowance(input: { prefix: string; limitId: string }, evaluate: EvaluateAllowance): Promise<Allowance> {
  const parsed = claimSchema.safeParse(input);
  if (!parsed.success) throw new Error("RATE_LIMIT_CONFIGURATION_INVALID");
  const key = `${parsed.data.prefix}:limit:v1:${parsed.data.limitId}`;
  try {
    const reply = await evaluate(RATE_LIMIT_SCRIPT, [key], [randomUUID()]);
    const [allowed, remaining, resetAt, now] = replySchema.parse(reply);
    return {
      allowed: allowed === 1,
      remaining,
      resetAt,
      retryAfterSeconds: allowed ? 0 : Math.ceil((resetAt - now) / 1000),
    };
  } catch {
    console.error("RATE_LIMIT_UNAVAILABLE");
    throw new Error("RATE_LIMIT_UNAVAILABLE");
  }
}

export async function claimRequestAllowance(ip: string): Promise<Allowance> {
  const env = getServerEnvironment();
  if (!env.IP_HASH_SECRET) throw new Error("RATE_LIMIT_CONFIGURATION_INVALID");
  const { redis, prefix } = getRedisConnection();
  const { limitId } = networkIds(ip, env.IP_HASH_SECRET);
  return claimAllowance({ prefix, limitId }, (script, keys, args) => redis.eval(script, keys, args));
}
