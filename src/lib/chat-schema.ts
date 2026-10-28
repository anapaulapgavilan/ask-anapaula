import { z } from "zod";
import { languages } from "./i18n";

const text = z.string().transform((value) => value.normalize("NFC"))
  .refine((value) => value.trim().length > 0, "Text must not be blank.")
  .refine((value) => Array.from(value).length <= 1000, "MESSAGE_TOO_LONG");
export const chatMessageSchema = z.strictObject({
  id: z.string().min(1).max(128).refine((value) => !/[\u0000-\u001f\u007f]/.test(value), "Invalid message ID."),
  role: z.enum(["user", "assistant"]),
  parts: z.tuple([z.strictObject({ type: z.literal("text"), text })]),
});
export const chatRequestSchema = z.strictObject({
  messages: z.array(chatMessageSchema).min(1).max(20, "CONVERSATION_TOO_LONG"),
  language: z.enum(languages),
}).superRefine(({ messages }, ctx) => {
  if (new Set(messages.map((message) => message.id)).size !== messages.length) {
    ctx.addIssue({ code: "custom", path: ["messages"], message: "Duplicate message IDs." });
  }
  if (messages.at(-1)?.role !== "user") {
    ctx.addIssue({ code: "custom", path: ["messages"], message: "Latest message must be from the user." });
  }
});
export type ChatRequest = z.infer<typeof chatRequestSchema>;
