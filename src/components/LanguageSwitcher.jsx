import { useTranslation } from "react-i18next";
import FlagIcon, { LANGUAGE_OPTIONS } from "./FlagIcon.jsx";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt" : "en";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {LANGUAGE_OPTIONS.map(lang => {
        const isSelected = current === lang.code;
        return (
          <div
            key={lang.code}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            aria-label={t(lang.labelKey)}
            onClick={() => i18n.changeLanguage(lang.code)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); i18n.changeLanguage(lang.code); } }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "14px 16px",
              borderRadius: 12,
              border: isSelected ? "1px solid #7C5CFC" : "1px solid #2A2A36",
              background: isSelected
                ? "linear-gradient(135deg, #7C5CFC11, #5B2FD411)"
                : "#16161E",
              cursor: "pointer",
              transition: "all 0.15s",
              position: "relative",
              overflow: "hidden",
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#3A3A48";
                e.currentTarget.style.background = "#1E1E28";
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = "#2A2A36";
                e.currentTarget.style.background = "#16161E";
              }
            }}
          >
            <div style={{
              padding: 3,
              borderRadius: "50%",
              border: isSelected ? "2px solid #7C5CFC88" : "2px solid #2A2A36",
              background: "#0D0D12",
              flexShrink: 0,
              transition: "border-color 0.15s",
            }}>
              <FlagIcon code={lang.code} size={40} shape="circle" />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 15,
                fontWeight: 600,
                color: isSelected ? "#7C5CFC" : "#F0F0F8",
                marginBottom: 2,
              }}>
                {t(lang.labelKey)}
              </div>
              <div style={{ fontSize: 12, color: "#8A8A9A" }}>
                {t(lang.countryKey)}
              </div>
            </div>

            {isSelected && (
              <div style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#7C5CFC",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>✓</span>
              </div>
            )}

            {isSelected && (
              <div style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 80,
                height: 80,
                background: "#7C5CFC",
                opacity: 0.05,
                borderRadius: "50%",
                pointerEvents: "none",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
