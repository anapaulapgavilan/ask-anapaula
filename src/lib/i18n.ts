import { APPROVED_CONTACT_EMAIL } from "../config/profile";

export const languages = ["en", "es"] as const;
export type Language = (typeof languages)[number];
export const messages = {
  en: {
    disclosure: "This is an AI version of Ana Paula.",
    contact: `Reach Ana Paula at ${APPROVED_CONTACT_EMAIL}.`,
    unavailable: `I'm having trouble right now. Reach Ana Paula at ${APPROVED_CONTACT_EMAIL}.`,
    incomplete: "I could not complete an answer from the available information.",
    invalid: "Please send a valid question of up to 1,000 characters in a conversation of up to 20 messages.",
    setup: "Chat is not available yet.",
  },
  es: {
    disclosure: "Esta es una versi\u00f3n de IA de Ana Paula.",
    contact: `Contacta a Ana Paula en ${APPROVED_CONTACT_EMAIL}.`,
    unavailable: `Estoy teniendo problemas en este momento. Contacta a Ana Paula en ${APPROVED_CONTACT_EMAIL}.`,
    incomplete: "No pude completar una respuesta con la informaci\u00f3n disponible.",
    invalid: "Env\u00eda una pregunta v\u00e1lida de hasta 1.000 caracteres en una conversaci\u00f3n de hasta 20 mensajes.",
    setup: "El chat todav\u00eda no est\u00e1 disponible.",
  },
} satisfies Record<Language, Record<string, string>>;
