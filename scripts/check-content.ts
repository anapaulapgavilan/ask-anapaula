import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { profile, type PublicProfile } from "../src/config/profile";
import { projects, type PublicProject } from "../src/config/projects";
import { KNOWLEDGE_FILES } from "../src/lib/knowledge-schema";
import { buildKnowledge } from "./build-knowledge";

export function readinessIssues(
  sections: { path: string }[],
  publicProfile: PublicProfile,
  publicProjects: PublicProject[],
  availableAssets: string[],
): string[] {
  const issues: string[] = [];
  for (const file of KNOWLEDGE_FILES) {
    if (!sections.some((section) => section.path === file)) issues.push(`Missing approved content: ${file}`);
  }
  for (const field of ["displayName", "biography", "oneLiner"] as const) {
    if (!publicProfile[field]) issues.push(`Missing approved profile: ${field}`);
  }
  for (const asset of ["photo", "cv", "illustration"] as const) {
    if (!publicProfile[asset]) issues.push(`Missing approved asset: ${asset}`);
    else if (!availableAssets.includes(asset)) issues.push(`Approved asset file unavailable: ${asset}`);
  }
  if (new Set(publicProjects.map((project) => project.id)).size !== 4) {
    issues.push("Exactly four distinct project cards are required.");
  }
  return issues;
}

export async function checkContent(ready: boolean): Promise<void> {
  const artifact = await buildKnowledge();
  const available: string[] = [];
  for (const asset of ["photo", "cv", "illustration"] as const) {
    if (profile[asset]) {
      try { await access(resolve("public", `.${profile[asset]}`)); available.push(asset); }
      catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
      }
    }
  }
  const issues = readinessIssues(artifact.sections, profile, projects, available);
  if (ready && issues.length) throw new Error(`Release not ready:\n${issues.join("\n")}`);
  console.log(`Content grammar PASS; ${artifact.sections.length} approved sections; ${issues.length} release gaps. ${ready ? "Structural readiness is not owner or live acceptance." : "Setup-only build permitted."}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--ready") || args.length > 1) throw new Error("Usage: check-content.ts [--ready]");
  await checkContent(args.includes("--ready"));
}
