let gaLoaded = false;

export function loadGoogleAnalytics() {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id) return;

  window[`ga-disable-${id}`] = false;

  if (gaLoaded) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", id, { anonymize_ip: true });

  gaLoaded = true;
}

export function unloadGoogleAnalytics() {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!id) return;

  window[`ga-disable-${id}`] = true;
  document.cookie.split(";").forEach((c) => {
    const name = c.split("=")[0].trim();
    if (name.startsWith("_ga")) {
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }
  });
}

export function trackPageview(path) {
  if (window.gtag) {
    window.gtag("event", "page_view", { page_path: path });
  }
}

export function trackEvent(name, params = {}) {
  if (window.gtag) {
    window.gtag("event", name, params);
  }
}
