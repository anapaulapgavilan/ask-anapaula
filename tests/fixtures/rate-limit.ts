import { RATE_LIMIT_CLOCK } from "../../src/lib/rate-limit";

export function withSyntheticClock(script: string, now: number, keys: string[]) {
  if (!Number.isSafeInteger(now) || now < 0 ||
      keys.length !== 1 || !keys[0].startsWith("integration:limit-") ||
      !script.includes(RATE_LIMIT_CLOCK)) {
    throw new Error("Invalid isolated limiter clock fixture.");
  }
  return script.replace(RATE_LIMIT_CLOCK, `local now = ${now}`);
}
