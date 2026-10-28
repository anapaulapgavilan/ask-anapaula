import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Nodes, RootContent } from "mdast";
import { unified } from "unified";
import remarkParse from "remark-parse";
import {
  KNOWLEDGE_FILES,
  knowledgeSchema,
  type KnowledgeArtifact,
} from "../src/lib/knowledge-schema";

export { KNOWLEDGE_FILES };
const parser = unified().use(remarkParse);
const statusPattern = /^<!-- status:(todo|approved) -->$/;

function fail(file: string, section: string, reason: string): never {
  throw new Error(`${file} / ${section}: ${reason}`);
}

function nodeText(node: Nodes): string {
  if ("children" in node) return node.children.map(nodeText).join("");
  return "value" in node ? node.value : "";
}

function safeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      !parsed.username &&
      !parsed.password &&
      (parsed.protocol === "https:" ||
        (parsed.protocol === "mailto:" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parsed.pathname)))
    );
  } catch {
    return false;
  }
}

function validateMarkup(
  node: Nodes,
  file: string,
  section: string,
  knownReferences: Set<string>,
): void {
  if (node.type === "html" && !statusPattern.test(node.value.trim())) {
    fail(file, section, "Unsafe HTML or invalid approval marker.");
  }
  if (node.type === "image" || node.type === "imageReference") {
    fail(file, section, "Unsafe embedded media; use approved text links.");
  }
  if ((node.type === "link" || node.type === "definition") && !safeUrl(node.url)) {
    fail(file, section, "Unsafe URL; use credential-free HTTPS or a public email link.");
  }
  if (node.type === "linkReference" && !knownReferences.has(node.identifier.toLowerCase())) {
    fail(file, section, "Malformed reference link.");
  }
  if (node.type === "text" && /!?\[[^\]\n]*\](?:\(|\[)/.test(node.value)) {
    fail(file, section, "Malformed link markup.");
  }
  if ("children" in node) {
    for (const child of node.children) validateMarkup(child, file, section, knownReferences);
  }
}

function validateSectionMarker(
  nodes: RootContent[],
  file: string,
  heading: string,
): "todo" | "approved" {
  const first = nodes[0];
  const marker = first?.type === "html" ? statusPattern.exec(first.value.trim()) : null;
  if (!marker) fail(file, heading, "One status marker must directly follow the level-two heading.");
  let count = 0;
  const countMarkers = (node: Nodes): void => {
    if (node.type === "html" && statusPattern.test(node.value.trim())) count++;
    if ("children" in node) node.children.forEach(countMarkers);
  };
  nodes.forEach(countMarkers);
  if (count !== 1) fail(file, heading, "Exactly one status marker is required.");
  return marker[1] === "approved" ? "approved" : "todo";
}

export function compileKnowledge(sources: Record<string, string>): KnowledgeArtifact {
  const unexpected = Object.keys(sources).filter(
    (file) => !KNOWLEDGE_FILES.some((allowed) => allowed === file),
  );
  if (unexpected.length) throw new Error(`Unexpected knowledge files: ${unexpected.sort().join(", ")}`);
  const missing = KNOWLEDGE_FILES.filter((file) => !(file in sources));
  if (missing.length) throw new Error(`Missing knowledge files: ${missing.join(", ")}`);

  const sections: KnowledgeArtifact["sections"] = [];
  const diagnostics: KnowledgeArtifact["diagnostics"] = [];
  for (const file of KNOWLEDGE_FILES) {
    const source = sources[file].replace(/\r\n?/g, "\n").normalize("NFC");
    const tree = parser.parse(source);
    const references = new Set(
      tree.children.filter((node) => node.type === "definition").map((node) => node.identifier.toLowerCase()),
    );
    tree.children.forEach((node) => validateMarkup(node, file, "document", references));
    const title = tree.children[0];
    if (title?.type !== "heading" || title.depth !== 1) fail(file, "document", "A level-one title is required.");
    const starts = tree.children.flatMap((node, index) =>
      node.type === "heading" && node.depth === 2 ? [index] : [],
    );
    if (!starts.length) fail(file, "document", "At least one level-two section is required.");
    let approvedCount = 0;
    for (const [sectionIndex, start] of starts.entries()) {
      const heading = nodeText(tree.children[start]);
      const nodes = tree.children.slice(start + 1, starts[sectionIndex + 1]);
      const status = validateSectionMarker(nodes, file, heading);
      if (status === "todo") continue;
      const firstBody = nodes[1];
      const lastBody = nodes.at(-1);
      const bodyStart = firstBody?.position?.start.offset;
      const bodyEnd = lastBody?.position?.end.offset;
      if (firstBody && (bodyStart === undefined || bodyEnd === undefined)) {
        fail(file, heading, "Cannot locate approved body in the source.");
      }
      let body = bodyStart !== undefined && bodyEnd !== undefined
        ? source.slice(bodyStart, bodyEnd).trim()
        : "";
      if (!body) fail(file, heading, "Approved body is empty.");
      const localReferences = new Set(
        nodes.filter((node) => node.type === "definition").map((node) => node.identifier.toLowerCase()),
      );
      nodes.slice(1).forEach((node) => validateMarkup(node, file, heading, localReferences));
      if (file === "06-faq.md") {
        if (!/^Answer:/.test(body)) fail(file, heading, "Approved FAQ must begin with Answer:.");
        body = body.slice("Answer:".length).trim();
      }
      if (!body) fail(file, heading, "Approved body is empty.");
      if (/\bTODO\b/.test(body)) fail(file, heading, "Approved body contains a TODO marker.");
      if (!nodes.some((node) => node.type !== "definition" && node.type !== "html" && node !== nodes[0] && nodeText(node).trim())) {
        fail(file, heading, "Approved body must contain text, not only definitions.");
      }
      sections.push({
        id: `${file}#section-${sectionIndex + 1}`,
        path: file,
        heading,
        body,
      });
      approvedCount++;
    }
    if (!approvedCount) diagnostics.push({ path: file, code: "NO_APPROVED_SECTIONS" });
  }
  const evidence = sections.map((section) => `[${section.id}]\n${section.body}`).join("\n\n");
  const revision = createHash("sha256")
    .update(JSON.stringify({ schemaVersion: 1, trustedPromptVersion: 1, sections }))
    .digest("hex");
  return knowledgeSchema.parse({ schemaVersion: 1, trustedPromptVersion: 1, revision, sections, evidence, diagnostics });
}

export async function buildKnowledge(root = process.cwd()): Promise<KnowledgeArtifact> {
  const output = resolve(root, "src/generated/knowledge.json");
  const temporary = `${output}.tmp`;
  try {
    const directory = resolve(root, "content");
    const entries = await readdir(directory, { withFileTypes: true });
    if (entries.some((entry) => !entry.isFile())) {
      throw new Error("Knowledge directory must contain only regular allowlisted Markdown files.");
    }
    const sources = Object.fromEntries(
      await Promise.all(entries.map(async (entry) => [
        entry.name,
        await readFile(resolve(directory, entry.name), "utf8"),
      ])),
    );
    const result = compileKnowledge(sources);
    await mkdir(resolve(root, "src/generated"), { recursive: true });
    await writeFile(temporary, `${JSON.stringify(result, null, 2)}\n`, { flag: "w" });
    await rename(temporary, output);
    return result;
  } catch (error) {
    await rm(temporary, { force: true });
    await rm(output, { force: true });
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const result = await buildKnowledge();
  console.log(`Knowledge ${result.revision}: ${result.sections.length} approved sections; ${result.diagnostics.length} documents awaiting approval. This is not release acceptance.`);
}
