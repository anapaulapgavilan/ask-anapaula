import { messages, type Language } from "../lib/i18n";

export function Disclaimer({ language }: { language: Language }) {
  return <p className="text-sm leading-relaxed text-stone-600">{messages[language].disclosure}</p>;
}
