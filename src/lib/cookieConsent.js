export function readCookieConsent() {
  try {
    const raw = localStorage.getItem("cookie_consent");
    if (!raw) return null;
    if (raw === "accepted") return { essential: true, analytics: true };
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent() {
  return readCookieConsent()?.analytics === true;
}
