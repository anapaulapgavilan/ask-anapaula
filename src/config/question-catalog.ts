const safeQuestions = [
  "What can I ask about?",
  "Tell me about the projects.",
  "What information is available?",
  "Que puedo preguntar?",
  "Cuentame de los proyectos.",
  "Que informacion esta disponible?",
] as const;
const normalize = (text: string) => text.normalize("NFC").trim().replace(/\s+/gu, " ").toLowerCase();
const catalog = new Map<string, string>(safeQuestions.map((question) => [normalize(question), question]));

export function selectSafeQuestion(text: string): string | null {
  return catalog.get(normalize(text)) ?? null;
}
