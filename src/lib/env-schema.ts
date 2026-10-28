import { z } from "zod";
import { APPROVED_CONTACT_EMAIL, httpsUrl } from "../config/profile";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => value === "" ? undefined : value, schema.optional());
const origin = httpsUrl.refine((value) => new URL(value).origin === value, "Use an HTTPS origin without a path.");
const schema = z.object({
  ANTHROPIC_API_KEY: optional(z.string().trim().min(1)),
  ANTHROPIC_MODEL: optional(z.string().trim().min(1)),
  UPSTASH_REDIS_REST_URL: optional(httpsUrl),
  UPSTASH_REDIS_REST_TOKEN: optional(z.string().trim().min(1)),
  IP_HASH_SECRET: optional(z.string().regex(/^(?:[a-fA-F0-9]{2}){32,}$/)),
  NEXT_PUBLIC_CONTACT_EMAIL: optional(z.literal(APPROVED_CONTACT_EMAIL)),
  NEXT_PUBLIC_LINKEDIN_URL: optional(httpsUrl),
  NEXT_PUBLIC_SITE_URL: optional(origin),
  CHAT_ENABLED: z.preprocess((value) => value === "" || value === undefined ? "false" : value, z.enum(["true", "false"])),
  REDIS_KEY_PREFIX: optional(z.string().regex(/^(production|preview|integration|test)(?::[a-zA-Z0-9_-]+)*$/)),
});

export function parseEnvironment(input: Record<string, string | undefined>) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`Invalid server configuration fields: ${fields.join(", ")}`);
  }
  const env = result.data;
  const required = [
    "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN", "IP_HASH_SECRET", "NEXT_PUBLIC_CONTACT_EMAIL",
    "NEXT_PUBLIC_SITE_URL", "REDIS_KEY_PREFIX",
  ] as const;
  if (env.CHAT_ENABLED === "true") {
    const missing = required.filter((key) => !env[key]);
    if (missing.length) throw new Error(`Incomplete enabled-chat configuration: ${missing.join(", ")}`);
    if (input.VERCEL_ENV === "production" && env.REDIS_KEY_PREFIX !== "production") {
      throw new Error("Invalid production REDIS_KEY_PREFIX configuration.");
    }
    if (input.VERCEL_ENV === "preview" && !env.REDIS_KEY_PREFIX?.startsWith("preview:")) {
      throw new Error("Invalid preview REDIS_KEY_PREFIX configuration.");
    }
  }
  return { ...env, chatEnabled: env.CHAT_ENABLED === "true" };
}
