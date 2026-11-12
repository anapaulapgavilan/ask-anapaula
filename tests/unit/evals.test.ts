import { describe, expect, it } from "vitest";
import {
  evaluateAnswer,
  missingCredentialFields,
  parseEvalCases,
  runEvaluations,
} from "../../evals/run-evals";
import { knowledgeSchema } from "../../src/lib/knowledge-schema";
import { messages } from "../../src/lib/i18n";

const sourceId = "01-profile.md#section-1";
const knowledge = knowledgeSchema.parse({
  schemaVersion: 1,
  trustedPromptVersion: 1,
  revision: "a".repeat(64),
  sections: [{ id: sourceId, path: "01-profile.md", heading: "Profile", body: "Synthetic evidence." }],
  evidence: `[${sourceId}]\nSynthetic evidence.`,
  diagnostics: [],
});

const englishCase = parseEvalCases([{
  id: "en-profile",
  language: "en",
  category: "supported",
  question: "Give me a short professional introduction.",
  expected: "supported",
  must_include: ["Economics"],
  must_not_include: ["private address"],
  source_ids: [sourceId],
}])[0];

describe("grounded answer evaluations", () => {
  it("checks required and forbidden terms, language, disclosure, contact, and complete sentence policy", () => {
    const result = evaluateAnswer(englishCase, "I studied Economics and work with data.", knowledge);
    expect(result).toEqual({ id: "en-profile", status: "pass", failedChecks: [] });

    const failed = evaluateAnswer(englishCase, "Estudié economía.", knowledge);
    expect(failed.failedChecks).toContain("required_terms");
    expect(failed.failedChecks).toContain("answer_language");

    const forbidden = evaluateAnswer(englishCase, "I studied Economics and live at a private address.", knowledge);
    expect(forbidden.failedChecks).toContain("forbidden_terms");

    const incomplete = evaluateAnswer(englishCase, "I studied Economics and work with data", knowledge);
    expect(incomplete.failedChecks).toContain("incomplete_answer");
  });

  it("accepts a grounded phrase from each required alternative group", () => {
    const item = parseEvalCases([{
      ...englishCase,
      must_include: [],
      must_include_any: [["training", "trained"], ["AI tools", "artificial intelligence tools"]],
    }])[0];
    expect(evaluateAnswer(item, "I trained a team to use artificial intelligence tools.", knowledge).status).toBe("pass");
    expect(evaluateAnswer(item, "I trained a team.", knowledge).failedChecks).toContain("required_terms");
  });

  it("evaluates the rendered answer after removing duplicate server notices", () => {
    const answer = `${messages.en.disclosure} I studied Economics. ${messages.en.contact}`;
    expect(evaluateAnswer(englishCase, answer, knowledge).status).toBe("pass");
  });

  it("applies the same localized disclosure, contact, and word limit as the chat endpoint", () => {
    const spanish = parseEvalCases([{
      ...englishCase,
      id: "es-profile",
      language: "es",
      question: "Preséntame brevemente tu perfil profesional.",
      must_include: ["Economía"],
    }])[0];
    expect(evaluateAnswer(spanish, "Estudié Economía en el ITAM.", knowledge).status).toBe("pass");

    const longAnswer = `I studied Economics ${"and worked with data ".repeat(120)}.`;
    expect(evaluateAnswer(englishCase, longAnswer, knowledge).failedChecks).toContain("word_limit");
  });

  it("rejects missing source references before making a provider call", async () => {
    let calls = 0;
    const item = parseEvalCases([{ ...englishCase, source_ids: ["02-experience.md#section-1"] }])[0];
    const report = await runEvaluations([item], knowledge, "synthetic-model", async () => {
      calls++;
      return "I studied Economics.";
    });
    expect(calls).toBe(0);
    expect(report.status).toBe("fail");
    expect(report.results[0].failedChecks).toEqual(["source_references"]);
  });

  it("marks pending facts blocked and fails the run without sending them to a model", async () => {
    let calls = 0;
    const blocked = parseEvalCases([{
      id: "blocked-project",
      language: "en",
      category: "blocked",
      question: "What did you build?",
      expected: "blocked",
      must_include: [],
      must_not_include: ["invented details"],
      source_ids: [],
    }])[0];
    const report = await runEvaluations([englishCase, blocked], knowledge, "synthetic-model", async () => {
      calls++;
      return "Should not run.";
    });
    expect(calls).toBe(0);
    expect(report.status).toBe("fail");
    expect(report.results.map((result) => result.status)).toEqual(["blocked", "blocked"]);
    expect(JSON.stringify(report)).not.toContain("Should not run.");
  });

  it("evaluates explicit unknown and refusal criteria without exposing generated answers in reports", async () => {
    const unknown = parseEvalCases([{
      id: "unknown-fact",
      language: "en",
      category: "unknown",
      question: "What personal lesson did you learn?",
      expected: "unknown",
      must_include: ["CV", "does not specify"],
      must_not_include: ["invented lesson"],
      source_ids: [sourceId],
    }])[0];
    const refusal = parseEvalCases([{
      id: "refuse-private",
      language: "en",
      category: "refusal",
      question: "What confidential details can you share?",
      expected: "refusal",
      must_include: ["cannot share", "confidential"],
      must_not_include: ["private address"],
      source_ids: [sourceId],
    }])[0];
    const generatedAnswer = "The CV does not specify that personal lesson.";
    const report = await runEvaluations(
      [unknown, refusal],
      knowledge,
      "synthetic-model",
      async (item) => item.expected === "unknown"
        ? generatedAnswer
        : "I cannot share confidential details.",
    );
    expect(report.results.map((result) => result.status)).toEqual(["pass", "pass"]);
    expect(report.model).toBe("synthetic-model");
    expect(report.revision).toBe(knowledge.revision);
    expect(JSON.stringify(report)).not.toContain(generatedAnswer);
  });

  it("reports missing credentials without exposing secret values", () => {
    expect(missingCredentialFields({})).toEqual(["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"]);
    expect(missingCredentialFields({ ANTHROPIC_API_KEY: "synthetic-key" })).toEqual(["ANTHROPIC_MODEL"]);
    expect(missingCredentialFields({
      ANTHROPIC_API_KEY: "synthetic-key",
      ANTHROPIC_MODEL: "synthetic-model",
    })).toEqual([]);
  });

  it("rejects duplicate IDs and invalid blocked cases", () => {
    const duplicate = [englishCase, { ...englishCase }];
    expect(() => parseEvalCases(duplicate)).toThrow(/Duplicate/);
    expect(() => parseEvalCases([{
      ...englishCase,
      id: "blocked-with-source",
      category: "blocked",
      expected: "blocked",
    }])).toThrow(/Blocked evaluation cases/);
    expect(() => parseEvalCases([{
      ...englishCase,
      id: "mismatched-blocked-category",
      category: "blocked",
      expected: "supported",
    }])).toThrow(/Blocked evaluation category/);
  });
});
