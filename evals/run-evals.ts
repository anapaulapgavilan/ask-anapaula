import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, type ModelMessage } from "ai";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parseEnvironment } from "../src/lib/env-schema";
import { buildKnowledge } from "../scripts/build-knowledge";
import { createAnswerFormatter, countWords, requestsDetail } from "../src/lib/answer-format";
import { buildSystemMessages } from "../src/lib/system-prompt";
import { knowledgeSchema, type KnowledgeArtifact } from "../src/lib/knowledge-schema";
import { languages, messages, replyLanguage, type Language } from "../src/lib/i18n";

const evalCaseSchema = z.strictObject({
  id: z.string().min(1),
  language: z.enum(languages),
  category: z.enum(["supported", "refusal", "injection", "unknown", "blocked"]),
  question: z.string().min(1),
  expected: z.enum(["supported", "refusal", "unknown", "blocked"]),
  must_include: z.array(z.string()),
  must_include_any: z.array(z.array(z.string().min(1)).min(1)).default([]),
  must_not_include: z.array(z.string()),
  source_ids: z.array(z.string().regex(/^[0-9]{2}-[a-z-]+\.md#section-[1-9][0-9]*$/)),
}).superRefine((item, context) => {
  if ((item.category === "blocked") !== (item.expected === "blocked")) {
    context.addIssue({ code: "custom", message: "Blocked evaluation category and expectation must match." });
  }
});

export const evalCasesSchema = z.array(evalCaseSchema).min(1);
export type EvaluationCase = z.infer<typeof evalCaseSchema>;
export type EvaluationResult = {
  id: string;
  status: "pass" | "fail" | "blocked";
  failedChecks: string[];
};
export type EvaluationReport = {
  status: "pass" | "fail";
  model: string;
  revision: string;
  results: EvaluationResult[];
};

const languageMarkers: Record<Language, readonly string[]> = {
  en: ["and", "from", "has", "her", "i", "is", "my", "she", "the", "was", "with"],
  es: ["con", "de", "el", "en", "es", "estudio", "la", "mi", "no", "para", "puedo", "soy", "una", "y"],
};

function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

function includesPhrase(text: string, phrase: string): boolean {
  return normalizeText(text).includes(normalizeText(phrase));
}

function languageScore(text: string, language: Language): number {
  const normalized = normalizeText(text);
  return languageMarkers[language].filter((marker) =>
    new RegExp(`\\b${marker}\\b`, "u").test(normalized),
  ).length;
}

function answerMatchesLanguage(text: string, language: Language): boolean {
  const otherLanguage = language === "en" ? "es" : "en";
  const expectedScore = languageScore(text, language);
  return expectedScore > 0 && expectedScore >= languageScore(text, otherLanguage);
}

export function parseEvalCases(input: unknown): EvaluationCase[] {
  const cases = evalCasesSchema.parse(input);
  const ids = new Set<string>();
  for (const item of cases) {
    if (ids.has(item.id)) throw new Error("Duplicate evaluation case ID.");
    ids.add(item.id);
    if (item.expected === "blocked" && item.source_ids.length) {
      throw new Error("Blocked evaluation cases must not cite unsupported sources.");
    }
  }
  return cases;
}

export function missingCredentialFields(
  input: { ANTHROPIC_API_KEY?: string; ANTHROPIC_MODEL?: string },
): string[] {
  return (["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"] as const).filter((key) => !input[key]);
}

function missingSourceReferences(item: EvaluationCase, knowledge: KnowledgeArtifact): boolean {
  const available = new Set(knowledge.sections.map((section) => section.id));
  return item.source_ids.some((sourceId) => !available.has(sourceId));
}

export function evaluateAnswer(
  item: EvaluationCase,
  modelText: string,
  knowledge: KnowledgeArtifact,
): EvaluationResult {
  if (item.expected === "blocked") {
    return { id: item.id, status: "blocked", failedChecks: ["facts_not_approved"] };
  }

  const failedChecks: string[] = [];
  if (missingSourceReferences(item, knowledge)) failedChecks.push("source_references");
  if (item.must_include.some((phrase) => !includesPhrase(modelText, phrase))) failedChecks.push("required_terms");
  if (item.must_include_any.some((group) => !group.some((phrase) => includesPhrase(modelText, phrase)))) {
    failedChecks.push("required_terms");
  }
  if (item.must_not_include.some((phrase) => includesPhrase(modelText, phrase))) failedChecks.push("forbidden_terms");
  if (!answerMatchesLanguage(modelText, replyLanguage(item.question, item.language))) {
    failedChecks.push("answer_language");
  }

  const language = replyLanguage(item.question, item.language);
  const formatter = createAnswerFormatter(language, true, requestsDetail(item.question));
  const streamed = formatter.push(modelText);
  const finalText = formatter.finish();
  const limited = formatter.limited;
  const visibleAnswer = `${formatter.prefix}${streamed}${finalText}`;
  if (!visibleAnswer.startsWith(messages[language].disclosure) ||
      !visibleAnswer.endsWith(messages[language].contact) ||
      visibleAnswer.indexOf(messages[language].disclosure, messages[language].disclosure.length) !== -1 ||
      visibleAnswer.indexOf(messages[language].contact, 0) !== visibleAnswer.length - messages[language].contact.length) {
    failedChecks.push("disclosure_or_contact");
  }
  if (includesPhrase(visibleAnswer, messages[language].incomplete)) {
    failedChecks.push("incomplete_answer");
  }
  if (limited || (!requestsDetail(item.question) && countWords(visibleAnswer) > 150)) {
    failedChecks.push("word_limit");
  }
  return {
    id: item.id,
    status: failedChecks.length ? "fail" : "pass",
    failedChecks,
  };
}

export async function runEvaluations(
  cases: EvaluationCase[],
  knowledge: KnowledgeArtifact,
  model: string,
  generate: (item: EvaluationCase, signal: AbortSignal) => Promise<string>,
): Promise<EvaluationReport> {
  if (cases.some((item) => item.expected === "blocked")) {
    return {
      status: "fail",
      model,
      revision: knowledge.revision,
      results: cases.map((item) => item.expected === "blocked"
        ? { id: item.id, status: "blocked", failedChecks: ["facts_not_approved"] }
        : { id: item.id, status: "blocked", failedChecks: ["suite_has_unapproved_facts"] }),
    };
  }
  const results: EvaluationResult[] = [];
  for (const item of cases) {
    if (missingSourceReferences(item, knowledge)) {
      results.push({ id: item.id, status: "fail", failedChecks: ["source_references"] });
      continue;
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const answer = await generate(item, controller.signal);
      results.push(evaluateAnswer(item, answer, knowledge));
    } catch {
      results.push({ id: item.id, status: "fail", failedChecks: ["provider_call"] });
    } finally {
      clearTimeout(timeout);
    }
  }
  return {
    status: results.every((result) => result.status === "pass") ? "pass" : "fail",
    model,
    revision: knowledge.revision,
    results,
  };
}

async function generateAnswer(
  item: EvaluationCase,
  knowledge: KnowledgeArtifact,
  modelId: string,
  apiKey: string,
  signal: AbortSignal,
): Promise<string> {
  const language = replyLanguage(item.question, item.language);
  const messagesForModel: ModelMessage[] = [
    ...buildSystemMessages(knowledge, language, true),
    { role: "user", content: item.question },
  ];
  const result = await generateText({
    model: createAnthropic({ apiKey })(modelId),
    messages: messagesForModel,
    allowSystemInMessages: true,
    maxOutputTokens: 600,
    maxRetries: 0,
    abortSignal: signal,
    providerOptions: { anthropic: { thinking: { type: "between_tools" } } },
  });
  return result.text;
}

async function main(): Promise<void> {
  const environment = parseEnvironment(process.env);
  const knowledge = knowledgeSchema.parse(await buildKnowledge());
  const missing = missingCredentialFields(environment);
  if (missing.length) {
    console.log(JSON.stringify({
      status: "fail",
      reason: "EVAL_CONFIGURATION_MISSING",
      missingFields: missing,
      model: environment.ANTHROPIC_MODEL ?? "unconfigured",
      revision: knowledge.revision,
    }));
    process.exitCode = 1;
    return;
  }
  const apiKey = environment.ANTHROPIC_API_KEY;
  const model = environment.ANTHROPIC_MODEL;
  if (!apiKey || !model) throw new Error("EVAL_CONFIGURATION_MISSING");
  const rawCases: unknown = JSON.parse(await readFile(resolve("evals/cases.json"), "utf8"));
  const cases = parseEvalCases(rawCases);
  const report = await runEvaluations(
    cases,
    knowledge,
    model,
    (item, signal) => generateAnswer(item, knowledge, model, apiKey, signal),
  );
  console.log(JSON.stringify(report));
  if (report.status !== "pass") process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await main();
}
