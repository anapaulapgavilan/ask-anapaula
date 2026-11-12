import { z } from "zod";

export const KNOWLEDGE_FILES = [
  "00-persona.md",
  "01-profile.md",
  "02-experience.md",
  "03-projects.md",
  "04-stories.md",
  "05-motivation.md",
  "06-faq.md",
  "99-boundaries.md",
] as const;

export const knowledgeSchema = z.strictObject({
  schemaVersion: z.literal(1),
  trustedPromptVersion: z.literal(1),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
  sections: z.array(z.strictObject({
    id: z.string().min(1),
    path: z.enum(KNOWLEDGE_FILES),
    heading: z.string().min(1),
    body: z.string().min(1),
  })),
  evidence: z.string(),
  diagnostics: z.array(z.strictObject({
    path: z.enum(KNOWLEDGE_FILES),
    code: z.literal("NO_APPROVED_SECTIONS"),
  })),
});

export type KnowledgeArtifact = z.infer<typeof knowledgeSchema>;
