import { readFileSync, readdirSync } from "node:fs";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildKnowledge, compileKnowledge, KNOWLEDGE_FILES } from "../../scripts/build-knowledge";

const fixture = readFileSync("tests/fixtures/knowledge/synthetic-approved.md", "utf8");
const templates = Object.fromEntries(
  readdirSync("content").map((file) => [file, readFileSync(`content/${file}`, "utf8")]),
);
const section = (body: string, marker = "<!-- status:approved -->") =>
  `# Synthetic\n\n## Synthetic example\n${marker}\n${body}\n`;
const sources = (replacement: string, file = "01-profile.md") => ({
  ...templates,
  [file]: replacement,
});

describe("approved Markdown compilation", () => {
  it("uses exactly eight templates and 39 empty initial FAQ answers", () => {
    expect(Object.keys(templates).sort()).toEqual([...KNOWLEDGE_FILES]);
    expect(templates["06-faq.md"].match(/^## /gm)).toHaveLength(39);
    expect(templates["06-faq.md"].match(/^Answer:$/gm)).toHaveLength(39);
    expect(templates["06-faq.md"].match(/^## TODO:/gm)).toHaveLength(25);
    const result = compileKnowledge(templates);
    expect(result.sections).toEqual([]);
    expect(result.evidence).toBe("");
    expect(result.diagnostics).toHaveLength(8);
  });

  it("includes only approved bodies, excluding TODO headings and question premises", () => {
    const result = compileKnowledge(sources(
      "# Synthetic\n\n## Did I win an unverified award?\n<!-- status:approved -->\nAnswer: No such award is documented.\n\n## Hidden achievement\n<!-- status:todo -->\nAnswer: A fabricated fact.\n",
      "06-faq.md",
    ));
    expect(result.sections[0].body).toBe("No such award is documented.");
    expect(result.evidence).not.toContain("Did I win");
    expect(result.evidence).not.toContain("Hidden achievement");
    expect(result.evidence).not.toContain("fabricated fact");
  });

  it("is deterministic across input ordering and changes revision when evidence changes", () => {
    const input = sources(fixture);
    const result = compileKnowledge(input);
    expect(compileKnowledge(Object.fromEntries(Object.entries(input).reverse()))).toEqual(result);
    expect(compileKnowledge(sources(section("A different synthetic statement."))).revision).not.toBe(result.revision);
    expect(compileKnowledge(templates).evidence).not.toContain("fictional fixture");
    expect(compileKnowledge(sources(fixture.replace("approved", "todo"))).sections).toEqual([]);
  });

  it("rejects unexpected or missing source files", () => {
    expect(() => compileKnowledge({ ...templates, "private-cv.md": fixture })).toThrow(/Unexpected/);
    const { "00-persona.md": omitted, ...missing } = templates;
    expect(omitted).toBeTruthy();
    expect(() => compileKnowledge(missing)).toThrow(/Missing/);
  });

  it.each([
    ["", /empty/],
    ["Answer: TODO: Write this later.", /TODO/],
    ["Answer:", /empty/],
  ])("rejects invalid approved FAQ content %j", (body, error) => {
    expect(() => compileKnowledge(sources(section(body), "06-faq.md"))).toThrow(error);
  });

  it.each([
    ["", /marker/],
    ["<!-- status:unknown -->", /marker/],
    ["<!-- status:approved -->\n<!-- status:todo -->", /marker/],
  ])("rejects missing, duplicate or invalid approval markers", (marker, error) => {
    expect(() => compileKnowledge(sources(section("Synthetic fact.", marker)))).toThrow(error);
  });

  it.each([
    "<script>alert(1)</script>",
    "<span onclick='bad()'>text</span>",
    "[bad](javascript:alert)",
    "[bad](data:text/html,test)",
    "[bad](http://example.test)",
    "[bad](//example.test)",
    "[bad](https://user:password@example.test)",
    "![external image](https://example.test/image.png)",
    "[bad][ref]\n\n[ref]: javascript:alert",
    "[unfinished](https://example.test",
  ])("rejects unsafe markup and malformed links: %s", (body) => {
    expect(() => compileKnowledge(sources(section(body)))).toThrow(/01-profile.md/);
  });

  it("validates unsafe markup even in unapproved sections", () => {
    expect(() => compileKnowledge(sources(section("<script>bad()</script>", "<!-- status:todo -->")))).toThrow(/Unsafe/);
  });

  it("handles Unicode, safe links and headings inside fenced code as content", () => {
    const body = "Una demostraci\u00f3n sint\u00e9tica.\n\n[Example](https://example.test)\n\n```text\n## Not a real heading\n<!-- status:todo -->\n```\n";
    const result = compileKnowledge(sources(section(body)));
    expect(result.sections).toHaveLength(1);
    expect(result.sections[0].body).toContain("Not a real heading");
    expect(result.sections[0].body).toContain("sint\u00e9tica");
  });

  it("preserves complete safe references within their approved section", () => {
    const result = compileKnowledge(sources(section("[Example][ref]\n\n[ref]: https://example.test")));
    expect(result.evidence).toContain("[ref]: https://example.test");
  });

  it("rejects references whose definitions would be omitted from approved evidence", () => {
    const input = section("[Example][ref]") +
      "\n## Not approved\n<!-- status:todo -->\n[ref]: https://example.test\n";
    expect(() => compileKnowledge(sources(input))).toThrow(/reference/);
  });

  it("requires the explicit FAQ answer prefix", () => {
    expect(() => compileKnowledge(sources(section("Synthetic fact."), "06-faq.md"))).toThrow(/Answer/);
  });

  it("does not interpret approval markers inside code as authority", () => {
    const input = "# Synthetic\n\n## Not approved\n```text\n<!-- status:approved -->\n```\n";
    expect(() => compileKnowledge(sources(input))).toThrow(/marker/);
  });

  it("regenerates deterministically and deletes stale evidence on a failed build", async () => {
    const root = await mkdtemp(join(tmpdir(), "ask-knowledge-test-"));
    try {
      await mkdir(join(root, "content"));
      await Promise.all(Object.entries(sources(fixture)).map(([file, body]) =>
        writeFile(join(root, "content", file), body),
      ));
      const first = await buildKnowledge(root);
      const output = join(root, "src/generated/knowledge.json");
      const serialized = await readFile(output, "utf8");
      expect(await buildKnowledge(root)).toEqual(first);
      expect(await readFile(output, "utf8")).toBe(serialized);
      await writeFile(join(root, "content/01-profile.md"), templates["01-profile.md"]);
      expect((await buildKnowledge(root)).sections).toEqual([]);
      await writeFile(join(root, "content/private-cv.md"), fixture);
      await expect(buildKnowledge(root)).rejects.toThrow(/Unexpected/);
      await expect(readFile(output, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
      await rm(join(root, "content/private-cv.md"));
      await symlink(join(root, "content/01-profile.md"), join(root, "content/unexpected.md"));
      await expect(buildKnowledge(root)).rejects.toThrow(/regular/);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
