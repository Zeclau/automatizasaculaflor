export type AgentSession = {
  id: string;
  first_name: string;
  agency_name: string | null;
  birth_date_formatted: string;
  country: string;
  phone_country_code?: string | null;
  phone_number?: string | null;
};

const KEY = "stc_agent_session_v1";

export function getSession(): AgentSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AgentSession) : null;
  } catch {
    return null;
  }
}

export function setSession(s: AgentSession) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export const WHATSAPP_NUMBER = "50576514498";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`;
export const SACUANJOCHE_URL = "https://sacuanjoche.dev";

/** Build a wa.me link with an optional pre-filled message. Safe for newlines/emojis. */
export function waLink(message?: string) {
  if (!message) return WHATSAPP_URL;
  return `${WHATSAPP_URL}?text=${encodeURIComponent(message)}`;
}

/** Dial codes for the 6 supported countries (+ USA). */
export const COUNTRY_DIAL_CODES: { country: string; code: string; flag: string }[] = [
  { country: "Nicaragua",   code: "+505", flag: "🇳🇮" },
  { country: "Guatemala",   code: "+502", flag: "🇬🇹" },
  { country: "El Salvador", code: "+503", flag: "🇸🇻" },
  { country: "Honduras",    code: "+504", flag: "🇭🇳" },
  { country: "Costa Rica",  code: "+506", flag: "🇨🇷" },
  { country: "Panamá",      code: "+507", flag: "🇵🇦" },
  { country: "USA",         code: "+1",   flag: "🇺🇸" },
];

export const PAISES = COUNTRY_DIAL_CODES.map(c => c.country);
