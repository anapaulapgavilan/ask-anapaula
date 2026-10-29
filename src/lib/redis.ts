import "server-only";
import { Redis } from "@upstash/redis";
import { getServerEnvironment } from "./env";

export function getRedisConnection() {
  const env = getServerEnvironment();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  const prefix = env.REDIS_KEY_PREFIX;
  if (!url || !token || !prefix) throw new Error("REDIS_CONFIGURATION_INCOMPLETE");
  return { redis: new Redis({ url, token, retry: { retries: 0 } }), prefix };
}
