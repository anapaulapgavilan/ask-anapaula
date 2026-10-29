import { APPROVED_CONTACT_EMAIL } from "../config/profile";
import type { Language } from "../lib/i18n";

const policy = {
  en: "When chat is enabled, questions are processed by an external AI provider. Application analytics store only reviewed catalog question text (other text is omitted), language, time and a pseudonymous network identifier for up to 30 days to understand usage. Full IP addresses and conversation transcripts are not saved in application analytics. Provider and hosting processing/retention are separate; this is not a promise of anonymity or zero retention.",
  es: "Cuando el chat esta activo, un proveedor externo de IA procesa las preguntas. Las estadisticas de la aplicacion guardan solo texto de un catalogo revisado (el resto del texto se omite), idioma, fecha y un identificador de red seudonimo durante hasta 30 dias para entender el uso. No se guardan IP completas ni conversaciones en estas estadisticas. El procesamiento y la retencion del proveedor y del alojamiento son independientes; no se promete anonimato ni retencion cero.",
};

export function PrivacyFooter({ language }: { language: Language }) {
  return (
    <footer className="space-y-3 text-sm leading-relaxed text-stone-600">
      <p>{policy[language]}</p>
      <p>
        <a className="underline" href={`mailto:${APPROVED_CONTACT_EMAIL}`}>{APPROVED_CONTACT_EMAIL}</a>
        {" \u00b7 "}
        <a className="underline" href="https://www.anthropic.com/legal/commercial-terms">
          {language === "es" ? "Condiciones del proveedor" : "Provider terms"}
        </a>
      </p>
    </footer>
  );
}
