import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Disclaimer } from "../../src/components/Disclaimer";
import { PrivacyFooter } from "../../src/components/PrivacyFooter";
import { messages } from "../../src/lib/i18n";
describe("localized privacy guidance", () => {
  it("explains pseudonymous analytics separately from provider retention in both languages", () => {
    for (const language of ["en", "es"] as const) {
      const footer = renderToStaticMarkup(createElement(PrivacyFooter, { language }));
      expect(footer).toContain("30");
      expect(footer).toContain("mailto:anapaulapgavilan@gmail.com");
      expect(footer).toContain("anthropic.com/legal/commercial-terms");
      expect(footer).toMatch(language === "en" ? /pseudonymous/ : /seudonimo/);
      expect(footer).toMatch(language === "en" ? /other text is omitted/ : /texto se omite/);
      expect(renderToStaticMarkup(createElement(Disclaimer, { language }))).toContain(messages[language].disclosure);
    }
  });
});
