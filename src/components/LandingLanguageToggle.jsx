import { useTranslation } from "react-i18next";

export default function LandingLanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt" : "en";
  const next = current === "en" ? "pt" : "en";

  const flags = { en: "🇬🇧", pt: "🇵🇹" };
  const labels = { en: "EN", pt: "PT" };

  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      title={current === "en" ? "Mudar para Português" : "Switch to English"}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "transparent",
        border: "1px solid #2A2A36",
        borderRadius: 8,
        padding: "6px 12px",
        cursor: "pointer",
        color: "#8A8A9A",
        fontSize: 13,
        fontWeight: 600,
        transition: "all 0.15s",
        letterSpacing: ".3px",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "#7C5CFC";
        e.currentTarget.style.color = "#7C5CFC";
        e.currentTarget.style.background = "#7C5CFC11";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "#2A2A36";
        e.currentTarget.style.color = "#8A8A9A";
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ fontSize: 16 }}>{flags[current]}</span>
      <span>{labels[current]}</span>
    </button>
  );
}
