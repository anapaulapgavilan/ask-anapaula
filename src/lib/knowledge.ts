import "server-only";
import { knowledgeSchema } from "./knowledge-schema";

export async function getKnowledge() {
  const { default: artifact } = await import("../generated/knowledge.json");
  return knowledgeSchema.parse(artifact);
}
