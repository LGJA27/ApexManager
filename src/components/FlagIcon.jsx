/** Inline SVG flags — consistent rendering across OS (no emoji flags). */

const FLAG_SVG_PROPS = {
  viewBox: "0 0 60 40",
  preserveAspectRatio: "xMidYMid slice",
  style: { width: "100%", height: "100%", display: "block" },
};

const FLAGS = {
  en: (
    <svg {...FLAG_SVG_PROPS} aria-hidden="true">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="6" />
    </svg>
  ),
  pt: (
    <svg {...FLAG_SVG_PROPS} aria-hidden="true">
      <rect width="24" height="40" fill="#046A38" />
      <rect x="24" width="36" height="40" fill="#DA020E" />
      <circle cx="24" cy="20" r="7.5" fill="#FFD100" stroke="#002776" strokeWidth="0.8" />
      <circle cx="24" cy="20" r="5" fill="#DA020E" stroke="#fff" strokeWidth="0.5" />
      <rect x="22.5" y="14" width="3" height="12" rx="0.5" fill="#fff" opacity="0.85" />
      <rect x="19" y="18.5" width="10" height="3" rx="0.5" fill="#fff" opacity="0.85" />
    </svg>
  ),
};

export default function FlagIcon({ code = "en", size = 24, shape = "rounded", style = {} }) {
  const flag = FLAGS[code === "pt" ? "pt" : "en"];
  const borderRadius = shape === "circle" ? "50%" : shape === "rounded" ? Math.round(size * 0.22) : 0;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: Math.round(size * (shape === "circle" ? 1 : 0.667)),
        borderRadius,
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: "0 1px 4px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.08)",
        ...style,
      }}
    >
      <span style={{ display: "block", width: "100%", height: "100%", lineHeight: 0 }}>
        {flag}
      </span>
    </span>
  );
}

export const LANGUAGE_OPTIONS = [
  { code: "en", labelKey: "settings.english", countryKey: "settings.langCountryUK" },
  { code: "pt", labelKey: "settings.portuguese", countryKey: "settings.langCountryPT" },
];
