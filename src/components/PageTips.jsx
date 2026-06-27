import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";

const C = {
  bg: "#0D0D12",
  surface: "#16161E",
  surfaceL: "#1E1E28",
  border: "#2A2A36",
  accent: "#7C5CFC",
  accentDim: "#7C5CFC22",
  text: "#F0F0F8",
  textSub: "#8A8A9A",
  textMuted: "#55556A",
};

export const TIP_PAGES = [
  "dashboard",
  "sales",
  "invoices",
  "expenses",
  "suppliers",
  "stock",
  "staff",
  "analytics",
  "settings",
];

function tipStorageKey(page) {
  return `apex_tip_seen_${page}`;
}

export function hasSeenPageTip(page) {
  try {
    return localStorage.getItem(tipStorageKey(page)) === "1";
  } catch {
    return false;
  }
}

export function markPageTipSeen(page) {
  try {
    localStorage.setItem(tipStorageKey(page), "1");
  } catch { /* ignore */ }
}

export default function PageTips({ page, isMobile }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const close = useCallback((markSeen = false) => {
    if (markSeen) markPageTipSeen(page);
    setOpen(false);
  }, [page]);

  useEffect(() => {
    if (!TIP_PAGES.includes(page)) return;
    if (hasSeenPageTip(page)) return;
    const timer = setTimeout(() => setOpen(true), 800);
    return () => clearTimeout(timer);
  }, [page]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!TIP_PAGES.includes(page)) return null;

  const title = t(`pageTips.${page}.title`, { defaultValue: "" });
  const intro = t(`pageTips.${page}.intro`, { defaultValue: "" });
  const tipsRaw = t(`pageTips.${page}.tips`, { returnObjects: true, defaultValue: [] });
  const tips = Array.isArray(tipsRaw) ? tipsRaw : [];

  const fabBottom = isMobile ? "calc(72px + env(safe-area-inset-bottom))" : 24;
  const panelBottom = isMobile ? "calc(128px + env(safe-area-inset-bottom))" : 88;

  return (
    <>
      {open && (
        <>
          <div
            role="presentation"
            onClick={() => close(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1400,
              background: "transparent",
            }}
          />
          <div
            role="dialog"
            aria-labelledby="page-tip-title"
            style={{
              position: "fixed",
              right: isMobile ? 12 : 24,
              left: isMobile ? 12 : "auto",
              bottom: panelBottom,
              width: isMobile ? "auto" : 380,
              maxWidth: isMobile ? "none" : 380,
              zIndex: 1410,
              background: C.surface,
              border: `1px solid ${C.accent}44`,
              borderRadius: 14,
              boxShadow: "0 12px 40px #000a, 0 0 0 1px #7C5CFC18",
              padding: "18px 20px 16px",
              animation: "tipIn 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }} aria-hidden>💡</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 id="page-tip-title" style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 700, color: C.text, lineHeight: 1.35 }}>
                  {title}
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: C.textSub, lineHeight: 1.65 }}>
                  {intro}
                </p>
              </div>
              <button
                type="button"
                onClick={() => close(false)}
                aria-label={t("common.cancel")}
                style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}
              >
                ✕
              </button>
            </div>
            {tips.length > 0 && (
              <ul style={{ margin: "0 0 16px", padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: 8 }}>
                {tips.map((tip) => (
                  <li key={tip} style={{ fontSize: 12.5, color: C.textSub, lineHeight: 1.55 }}>
                    {tip}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={() => close(true)}
              style={{
                width: "100%",
                padding: "10px 0",
                borderRadius: 8,
                border: "none",
                background: C.accent,
                color: "#fff",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {t("pageTips.gotIt")}
            </button>
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("pageTips.fabLabel")}
        title={t("pageTips.fabLabel")}
        style={{
          position: "fixed",
          right: isMobile ? 16 : 24,
          bottom: fabBottom,
          zIndex: 1390,
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: `1px solid ${C.border}`,
          background: C.surfaceL,
          color: C.accent,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          boxShadow: "0 4px 16px #0006",
          transition: "transform 0.15s ease, box-shadow 0.15s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.05)";
          e.currentTarget.style.boxShadow = "0 6px 20px #7C5CFC33";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px #0006";
        }}
      >
        💡
      </button>

      <style>{`
        @keyframes tipIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
}
