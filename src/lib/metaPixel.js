let pixelLoaded = false;

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

export function trackMetaEvent(name, params = {}) {
  if (window.fbq) window.fbq("track", name, params);
}
