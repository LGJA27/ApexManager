import { useTranslation } from "react-i18next";

const C = {
  border: "#2A2A36",
  accent: "#7C5CFC",
  textSub: "#8A8A9A",
};

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.language?.startsWith("pt") ? "pt" : "en";

  const toggle = () => {
    const next = current === "en" ? "pt" : "en";
    i18n.changeLanguage(next);
  };

  return (
    <button
      onClick={toggle}
      title={current === "en" ? "Mudar para Português" : "Switch to English"}
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 7,
        color: C.textSub,
        fontSize: 12,
        fontWeight: 600,
        padding: "5px 10px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all 0.15s",
        letterSpacing: ".3px",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.accent;
        e.currentTarget.style.color = C.accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.color = C.textSub;
      }}
    >
      {current === "en" ? "🇵🇹 PT" : "🇬🇧 EN"}
    </button>
  );
}
