import "server-only";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { selectSafeQuestion } from "../config/question-catalog";
import { networkIds } from "./network-identity";
import { languages, type Language } from "./i18n";
import { getRedisConnection } from "./redis";
import { getServerEnvironment } from "./env";
import { redisPrefixSchema } from "./env-schema";

export const questionRecordSchema = z.strictObject({
  question: z.string().refine((value) => selectSafeQuestion(value) === value).nullable(),
  language: z.enum(languages),
  timestamp: z.iso.datetime(),
  ipHash: z.string().regex(/^[a-f0-9]{64}$/),
});
export type QuestionRecord = z.infer<typeof questionRecordSchema>;
export type QuestionWriter = (key: string, value: QuestionRecord, ttl: number) => Promise<void>;

export async function logQuestion(
  input: { question: string; language: Language; ip: string; secret: string; prefix: string },
  write: QuestionWriter,
): Promise<string> {
  if (!redisPrefixSchema.safeParse(input.prefix).success) {
    throw new Error("QUESTION_LOG_CONFIGURATION_INVALID");
  }
  const record = questionRecordSchema.parse({
    question: selectSafeQuestion(input.question),
    language: input.language,
    timestamp: new Date().toISOString(),
    ipHash: networkIds(input.ip, input.secret).analyticsId,
  });
  const key = `${input.prefix}:question:v1:${randomUUID()}`;
  try { await write(key, record, 2592000); }
  catch {
    console.error("QUESTION_LOG_WRITE_FAILED");
    throw new Error("QUESTION_LOG_WRITE_FAILED");
  }
  return key;
}

export async function persistQuestion(question: string, language: Language, ip: string): Promise<void> {
  const { redis, prefix } = getRedisConnection();
  const secret = getServerEnvironment().IP_HASH_SECRET;
  if (!secret) throw new Error("QUESTION_LOG_CONFIGURATION_INVALID");
  await logQuestion({ question, language, ip, prefix, secret }, async (key, value, ttl) => {
    const result = await redis.set(key, value, { ex: ttl });
    if (result !== "OK") throw new Error("QUESTION_LOG_WRITE_FAILED");
  });
}
