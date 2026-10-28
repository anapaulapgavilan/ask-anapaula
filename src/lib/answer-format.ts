import { messages, type Language } from "./i18n";

export function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/u).length : 0;
}
export function requestsDetail(text: string): boolean {
  const normalized = text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  return /\b(more detail(?:s)?|in detail|detailed (?:answer|explanation)|mas detalles|en detalle)\b/.test(normalized);
}

function sentenceEnd(text: string, final: boolean): number {
  let brackets = 0;
  let parentheses = 0;
  let code = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "`") code = !code;
    if (code) continue;
    if (char === "[") brackets++;
    if (char === "]") brackets = Math.max(0, brackets - 1);
    if (char === "(") parentheses++;
    if (char === ")") parentheses = Math.max(0, parentheses - 1);
    if (brackets || parentheses || !/[.!?]/.test(char)) continue;
    if (char === "." && /(?:\b(?:Dr|Dra|Mr|Mrs|Ms|Sr|Sra|Srta|Prof|St|vs|etc)|\b[A-Z])\.$/i.test(text.slice(0, i + 1))) continue;
    let end = i + 1;
    while (end < text.length && /["'\u201d\u2019]/.test(text[end])) end++;
    if ((end < text.length && /\s/u.test(text[end])) || (final && end === text.length)) return end;
  }
  return -1;
}

export function createAnswerFormatter(language: Language, firstTurn: boolean, detailed: boolean) {
  const copy = messages[language];
  const prefix = firstTurn ? `${copy.disclosure} ` : "";
  let remaining = detailed ? Infinity : 150 - countWords(prefix) - countWords(copy.contact);
  let buffer = "";
  let emitted = false;
  let limited = false;
  let finished = false;
  const drain = (final: boolean): string => {
    let output = "";
    while (!limited) {
      const end = sentenceEnd(buffer, final);
      if (end < 0) break;
      const sentence = buffer.slice(0, end).trim();
      buffer = buffer.slice(end).trimStart();
      const size = countWords(sentence);
      if (size > remaining) { limited = true; buffer = ""; break; }
      remaining -= size;
      output += `${sentence} `;
      emitted = true;
    }
    return output;
  };
  return {
    prefix,
    push(delta: string): string {
      if (finished) throw new Error("Cannot write to a finished answer.");
      if (limited) return "";
      buffer += delta;
      if (buffer.length > 65536) throw new Error("Answer buffer ceiling exceeded.");
      return drain(false);
    },
    finish(): string {
      if (finished) throw new Error("Answer already finished.");
      const last = drain(true);
      finished = true;
      return `${last}${emitted ? "" : `${copy.incomplete} `}${copy.contact}`;
    },
    get limited() { return limited; },
  };
}
