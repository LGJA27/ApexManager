import { hasAnalyticsConsent } from "./cookieConsent.js";
import { supabase } from "./supabase.js";

let pixelLoaded = false;

const CAPI_EVENTS = new Set(["CompleteRegistration", "Purchase", "StartTrial"]);

export function generateMetaEventId() {
  return `apex_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function getMetaCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

async function sendMetaConversion({ eventName, eventId, customData, email }) {
  if (!hasAnalyticsConsent() || !CAPI_EVENTS.has(eventName)) return;

  try {
    await fetch("/api/meta-conversion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        eventId,
        eventSourceUrl: window.location.href,
        customData,
        email,
        fbp: getMetaCookie("_fbp"),
        fbc: getMetaCookie("_fbc"),
      }),
    });
  } catch {
    /* CAPI is best-effort; browser pixel remains primary */
  }
}

export function loadMetaPixel() {
  const id = import.meta.env.VITE_META_PIXEL_ID;
  if (!id) return;

  if (pixelLoaded) {
    if (window.fbq) window.fbq("consent", "grant");
    return;
  }

  /* eslint-disable */
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
  n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
  s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(
  window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */

  window.fbq("init", id);
  window.fbq("track", "PageView");
  pixelLoaded = true;
}

export function unloadMetaPixel() {
  if (window.fbq) {
    window.fbq("consent", "revoke");
  }
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name.startsWith("_fbp") || name.startsWith("_fbc")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
}

export function trackMetaPageView() {
  if (window.fbq) window.fbq("track", "PageView");
}

/**
 * Track a Meta event in the browser pixel and (for conversion events) via CAPI.
 * @param {string} name - Meta standard event name
 * @param {object} params - custom_data fields
 * @param {{ eventId?: string, email?: string }} options
 */
export function trackMetaEvent(name, params = {}, options = {}) {
  if (!window.fbq) return;

  const eventId = options.eventId || generateMetaEventId();
  window.fbq("track", name, params, { eventID: eventId });

  sendMetaConversion({
    eventName: name,
    eventId,
    customData: params,
    email: options.email,
  });
}

export const PENDING_PURCHASE_KEY = "apex_pending_purchase";

/** Fire Meta Purchase once per unique checkout (deduped via sessionStorage). */
export function trackMetaPurchase({ value, currency = "EUR", content_name, content_type = "product", dedupId, email }) {
  if (!dedupId || !window.fbq) return false;

  const key = `apex_meta_purchase_${dedupId}`;
  if (sessionStorage.getItem(key)) return false;

  const eventId = `purchase_${dedupId}`;
  const customData = {
    value: Number(value),
    currency,
    content_name,
    content_type,
  };

  window.fbq("track", "Purchase", customData, { eventID: eventId });

  const resolveEmail = email
    ? Promise.resolve(email)
    : supabase
      ? supabase.auth.getSession().then(({ data: { session } }) => session?.user?.email)
      : Promise.resolve(undefined);

  resolveEmail.then((resolvedEmail) => {
    sendMetaConversion({
      eventName: "Purchase",
      eventId,
      customData,
      email: resolvedEmail,
    });
  });

  sessionStorage.setItem(key, "1");
  return true;
}
