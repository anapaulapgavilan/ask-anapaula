"use client";

import type { Language } from "../lib/i18n";

export function LanguageToggle({
  language,
  onChange,
  label,
}: {
  language: Language;
  onChange: (language: Language) => void;
  label: string;
}) {
  return (
    <div aria-label={label} className="toggle-group" role="group">
      <button aria-pressed={language === "en"} onClick={() => onChange("en")} type="button">
        English
      </button>
      <button aria-pressed={language === "es"} onClick={() => onChange("es")} type="button">
        Español
      </button>
    </div>
  );
}
