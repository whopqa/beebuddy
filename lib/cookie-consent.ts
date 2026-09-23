export const COOKIE_CONSENT_KEY = "beebuddy_cookie_preferences_v1";
export const COOKIE_CONSENT_EVENT = "beebuddy:cookie-consent";

export type CookiePreferences = {
  essential: true;
  preference: boolean;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
  decidedAt: string;
  version: 1;
};

export type CookiePreferenceSelection = Omit<CookiePreferences, "decidedAt" | "version">;

export function readCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as CookiePreferences;
    return value.version === 1 && value.essential === true ? value : null;
  } catch {
    return null;
  }
}

export function getConsentSessionId() {
  const key = "beebuddy_consent_session";
  let id = window.localStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `bb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.localStorage.setItem(key, id);
  }
  return id;
}

export function saveCookiePreferences(input: CookiePreferenceSelection) {
  const preferences: CookiePreferences = {
    ...input,
    essential: true,
    decidedAt: new Date().toISOString(),
    version: 1,
  };
  window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(preferences));
  window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_EVENT, { detail: preferences }));

  void fetch("/api/legal/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      consentType: "COOKIES",
      isAccepted: true,
      sessionId: getConsentSessionId(),
    }),
  }).catch(() => undefined);
  return preferences;
}
