import { describe, expect, it } from "vitest";
import { createAnswerFormatter, countWords, requestsDetail } from "../../src/lib/answer-format";
import { messages } from "../../src/lib/i18n";

function format(text: string, chunkSize = 1, detailed = false, firstTurn = true) {
  const f = createAnswerFormatter("en", firstTurn, detailed);
  let output = f.prefix;
  for (let i = 0; i < text.length; i += chunkSize) output += f.push(text.slice(i, i + chunkSize));
  return output + f.finish();
}
describe("sentence-safe visible output", () => {
  it("reserves exact mandatory notices in both languages and on later turns", () => {
    for (const language of ["en", "es"] as const) {
      for (const first of [true, false]) {
        const f = createAnswerFormatter(language, first, false);
        const reserved = countWords(f.prefix) + countWords(messages[language].contact);
        const sentence = Array(150 - reserved).fill("word").join(" ") + ". ";
        const output = f.prefix + f.push(sentence) + f.finish();
        expect(countWords(output)).toBe(150);
        expect(output).toContain(messages[language].contact);
        expect(output.includes(messages[language].disclosure)).toBe(first);
      }
    }
  });
  it("counts trusted disclosure/contact inside exact 150/151-word boundaries", () => {
    const reserved = countWords(`${messages.en.disclosure} ${messages.en.contact}`);
    const text = Array(150 - reserved).fill("word").join(" ") + ".";
    expect(countWords(format(text))).toBe(150);
    const overflow = Array(151 - reserved).fill("word").join(" ") + ".";
    expect(format(overflow)).not.toContain("word");
    expect(format(overflow)).toContain(messages.en.incomplete);
  });
  it("streams complete sentences, preserving links and punctuation across chunks", () => {
    const text = "Dr. Example uses 3.14 units. Visit [Example](https://example.test/a.b) for context. Email example@example.test for help.";
    expect(format(text)).toContain(text);
    expect(format(text, 17)).toBe(format(text, 1));
    const f = createAnswerFormatter("en", false, false);
    expect(f.push("A complete sentence. ")).toContain("A complete sentence.");
    expect(f.push("An unfinished")).toBe("");
    expect(f.finish()).not.toContain("unfinished");
  });
  it("drops token-exhausted tails, keeps contact and uses truthful guidance if nothing fits", () => {
    const output = format("unfinished [link](https://example.test");
    expect(output).not.toContain("unfinished");
    expect(output).toContain(messages.en.incomplete);
    expect(output).toContain(messages.en.contact);
    expect(output).toContain(messages.en.disclosure);
    expect(countWords(output)).toBeLessThanOrEqual(150);
    expect(format("A complete sentence. An unfinished tail")).not.toContain("tail");
  });
  it("only relaxes word limits for explicit tested EN/ES detail requests", () => {
    for (const question of ["Please give more detail", "Explain in detail", "Dame m\u00e1s detalles", "Explica en detalle"]) expect(requestsDetail(question)).toBe(true);
    for (const question of ["Tell me about projects", "Tell me more", "Hola"]) expect(requestsDetail(question)).toBe(false);
    expect(countWords(format(Array(170).fill("word").join(" ") + ".", 10, true))).toBeGreaterThan(150);
  });
  it("does not mistake URL/email/abbreviation dots for terminal punctuation", () => {
    const f = createAnswerFormatter("es", false, false);
    expect(f.push("El Dr. ")).toBe("");
    expect(f.push("Ejemplo usa https://example.test/a.b ")).toBe("");
    expect(f.push("y escribe a example@example.test. ")).toContain("El Dr. Ejemplo");
    expect(f.finish()).toContain(messages.es.contact);
  });
});
