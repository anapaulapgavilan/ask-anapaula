import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readinessIssues } from "../../scripts/check-content";
import { buildKnowledge, compileKnowledge } from "../../scripts/build-knowledge";
import { profileSchema } from "../../src/config/profile";
import { projects } from "../../src/config/projects";
import { KNOWLEDGE_FILES } from "../../src/lib/knowledge-schema";
import { parseEvalCases } from "../../evals/run-evals";

function syntheticSources(profileBody = "Approved synthetic profile fact.") {
  return Object.fromEntries(KNOWLEDGE_FILES.map((path) => {
    const body = path === "01-profile.md" ? profileBody : "Approved synthetic source.";
    const faqPrefix = path === "06-faq.md" ? "Answer: " : "";
    return [
      path,
      `# Synthetic ${path}\n\n## Approved section\n<!-- status:approved -->\n${faqPrefix}${body}\n\n## Pending section\n<!-- status:todo -->\nNever publish this pending synthetic fact.\n`,
    ];
  }));
}

const readyProfile = profileSchema.parse({
  contactEmail: "anapaulapgavilan@gmail.com",
  displayName: "Synthetic profile",
  biography: "A synthetic biography for readiness checks.",
  oneLiner: "A synthetic professional profile.",
  photo: "/photo.jpg",
  cv: "/cv.pdf",
  illustration: "/avatar/ana-paula-animated.svg",
});

describe("knowledge publication contract", () => {
  it("distinguishes template-only readiness from a structurally complete profile", () => {
    const templateProfile = profileSchema.parse({ contactEmail: "anapaulapgavilan@gmail.com" });
    const incomplete = readinessIssues([], templateProfile, projects, []);
    expect(incomplete).toContain("Missing approved content: 01-profile.md");
    expect(incomplete).toContain("Missing approved profile: biography");
    expect(incomplete).toContain("Missing approved asset: cv");
    expect(profileSchema.safeParse({}).success).toBe(false);

    const sections = KNOWLEDGE_FILES.map((path) => ({ path }));
    expect(readinessIssues(sections, readyProfile, projects, ["photo", "cv", "illustration"])).toEqual([]);
    expect(readinessIssues(sections, readyProfile, [], ["photo", "cv", "illustration"]))
      .toContain("Exactly four distinct project cards are required.");
  });

  it("regenerates changed facts, excludes pending facts, and removes stale artifacts after invalid input", async () => {
    const root = await mkdtemp(join(tmpdir(), "ask-knowledge-publication-"));
    try {
      const content = join(root, "content");
      await mkdir(content);
      const initialSources = syntheticSources();
      await Promise.all(Object.entries(initialSources).map(([path, body]) =>
        writeFile(join(content, path), body),
      ));

      const initial = await buildKnowledge(root);
      expect(initial.evidence).toContain("Approved synthetic profile fact.");
      expect(initial.evidence).not.toContain("Never publish this pending synthetic fact.");
      expect(await readdir(join(root, "src", "generated"))).toEqual(["knowledge.json"]);

      await writeFile(
        join(content, "01-profile.md"),
        syntheticSources("Changed approved synthetic fact.")["01-profile.md"],
      );
      const updated = await buildKnowledge(root);
      expect(updated.revision).not.toBe(initial.revision);
      expect(updated.evidence).toContain("Changed approved synthetic fact.");
      expect(updated.evidence).not.toContain("Approved synthetic profile fact.");

      await writeFile(join(content, "private-cv.md"), "Unapproved source.");
      await expect(buildKnowledge(root)).rejects.toThrow(/Unexpected knowledge files/);
      await expect(readFile(join(root, "src", "generated", "knowledge.json"), "utf8"))
        .rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("keeps blocked fixtures source-free and uses approved facts in the current evaluation suite", async () => {
    const cases: unknown = JSON.parse(await readFile("evals/cases.json", "utf8"));
    const parsed = parseEvalCases(cases);
    expect(parsed.every((item) => item.expected !== "blocked")).toBe(true);

    const blockedFixture = {
      id: "blocked-unapproved-motivation",
      language: "en",
      category: "blocked",
      question: "Why do you want to pursue an MBA?",
      expected: "blocked",
      must_include: [],
      must_not_include: ["invented motivation"],
      source_ids: [],
    };
    expect(() => parseEvalCases([{
      ...blockedFixture,
      source_ids: ["03-projects.md#section-1"],
    }])).toThrow(/Blocked evaluation cases/);
  });

  it("resolves every active evaluation source against the current approved corpus", async () => {
    const sources = Object.fromEntries(await Promise.all(KNOWLEDGE_FILES.map(async (path) => [
      path,
      await readFile(join("content", path), "utf8"),
    ])));
    const knowledge = compileKnowledge(sources);
    const cases: unknown = JSON.parse(await readFile("evals/cases.json", "utf8"));
    const activeCases = parseEvalCases(cases).filter((item) => item.expected !== "blocked");
    const availableSources = new Set(knowledge.sections.map((section) => section.id));
    for (const item of activeCases) {
      for (const sourceId of item.source_ids) {
        expect(availableSources.has(sourceId), `${item.id} references ${sourceId}`).toBe(true);
      }
    }
  });

  it("publishes only the owner's selected public GitHub projects and approved boundaries", async () => {
    const sources = Object.fromEntries(await Promise.all(KNOWLEDGE_FILES.map(async (path) => [
      path,
      await readFile(join("content", path), "utf8"),
    ])));
    const knowledge = compileKnowledge(sources);
    const projectsContent = knowledge.sections
      .filter((section) => section.path === "03-projects.md")
      .map((section) => section.body)
      .join("\n");
    const boundariesContent = knowledge.sections
      .filter((section) => section.path === "99-boundaries.md")
      .map((section) => section.body)
      .join("\n");

    expect(projectsContent).toContain("https://github.com/anapaulapgavilan/42-Transcendence");
    expect(projectsContent).toContain("https://github.com/anapaulapgavilan/42-Cub3d");
    expect(projectsContent).toContain("https://github.com/anapaulapgavilan/42-Minishell");
    expect(projectsContent).toContain("https://github.com/anapaulapgavilan/42-WebServ");
    expect(projectsContent).not.toMatch(/Mi Inflacion|Remesas MX|Unit Economics Lab|Fintech for Lawyers/);
    expect(boundariesContent).toContain("No publicaré ni compartiré mi CV ni mi foto.");
    expect(boundariesContent).toContain("No divulgaré código, detalles ni información de repositorios privados.");
  });
});
