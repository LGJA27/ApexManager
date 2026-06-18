import { useTranslation } from "react-i18next";
import FlagIcon, { LANGUAGE_OPTIONS } from "./FlagIcon.jsx";

const C = {
  border: "#2A2A36",
  borderActive: "#7C5CFC",
  surface: "#16161E",
  surfaceActive: "#7C5CFC18",
  text: "#8A8A9A",
  textActive: "#F0F0F8",
  accent: "#7C5CFC",
};

export default function LandingLanguageToggle({ compact = false }) {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt" : "en";

  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 2 : 3,
        padding: compact ? 3 : 4,
        borderRadius: compact ? 9 : 10,
        background: C.surface,
        border: `1px solid ${C.border}`,
      }}
    >
      {LANGUAGE_OPTIONS.map(lang => {
        const isActive = current === lang.code;
        return (
          <button
            key={lang.code}
            type="button"
            onClick={() => i18n.changeLanguage(lang.code)}
            title={lang.code === "en" ? "English" : "Português"}
            aria-pressed={isActive}
            aria-label={lang.code === "en" ? "English" : "Português"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: compact ? 5 : 6,
              padding: compact ? "5px 8px" : "6px 10px",
              borderRadius: compact ? 6 : 7,
              border: "none",
              cursor: "pointer",
              background: isActive ? C.surfaceActive : "transparent",
              color: isActive ? C.textActive : C.text,
              fontSize: compact ? 11 : 12,
              fontWeight: 700,
              letterSpacing: ".4px",
              transition: "all 0.15s",
              boxShadow: isActive ? `0 0 0 1px ${C.borderActive}55` : "none",
            }}
            onMouseEnter={e => {
              if (!isActive) {
                e.currentTarget.style.background = "#1E1E28";
                e.currentTarget.style.color = C.accent;
              }
            }}
            onMouseLeave={e => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = C.text;
              }
            }}
          >
            <FlagIcon
              code={lang.code}
              size={compact ? 18 : 20}
              shape="rounded"
              style={{ boxShadow: isActive ? `0 0 0 1px ${C.accent}44` : undefined }}
            />
            <span>{lang.code.toUpperCase()}</span>
          </button>
        );
      })}
    </div>
  );
}
