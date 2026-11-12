export const SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

export function authMode(value: string | undefined, deployment?: string): "disabled" | "google" {
  if (value === "google") return "google";
  if ((value === undefined || value === "" || value === "disabled") && deployment !== "production") return "disabled";
  throw new Error("AUTH_MODE_INVALID");
}

export function isSessionAgeValid(signedInAt: unknown, now = Date.now()): boolean {
  return typeof signedInAt === "number" &&
    Number.isSafeInteger(signedInAt) &&
    signedInAt <= now &&
    now - signedInAt < SESSION_MAX_AGE_SECONDS * 1000;
}

export function googleAuthConfigured(env: Record<string, string | undefined>): boolean {
  if (!env.AUTH_GOOGLE_ID?.trim() || !env.AUTH_GOOGLE_SECRET?.trim() ||
    !env.AUTH_SECRET || Buffer.byteLength(env.AUTH_SECRET, "utf8") < 32 || !env.AUTH_URL) return false;
  try {
    const url = new URL(env.AUTH_URL);
    return url.protocol === "https:" && url.origin === env.AUTH_URL &&
      (env.VERCEL_ENV !== "production" || env.NEXT_PUBLIC_SITE_URL === env.AUTH_URL);
  } catch {
    return false;
  }
}
