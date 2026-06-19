import { useState, useEffect, useRef } from "react";
import { DayPicker } from "react-day-picker";
import { format } from "date-fns";
import { enGB } from "react-day-picker/locale";
import "react-day-picker/style.css";

const C = {
  surface: "#16161E",
  surfaceL: "#1E1E28",
  border: "#2A2A36",
  accent: "#7C5CFC",
  accentDim: "#7C5CFC22",
  text: "#F0F0F8",
  textSub: "#8A8A9A",
  textMuted: "#55556A",
};

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function parseYmd(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYmd(date) {
  return format(date, "yyyy-MM-dd");
}

export default function DateInput({ label, value, onChange, disabled = false, style = {} }) {
  const w = useWindowWidth();
  const pick = (mobile, desktop) => (w >= 1024 ? desktop : w >= 768 ? Math.round((mobile + desktop) / 2) : mobile);
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  const selected = parseYmd(value);
  const display = selected ? format(selected, "dd/MM/yyyy") : "";

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleSelect = (date) => {
    if (!date) return;
    onChange(toYmd(date));
    setOpen(false);
  };

  return (
    <div ref={rootRef} style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative", ...style }}>
      {label && (
        <label style={{ fontSize: pick(12, 13), color: C.textSub, fontWeight: 500 }}>{label}</label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.surfaceL,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          color: display ? C.text : C.textMuted,
          fontSize: pick(14, 15),
          padding: "10px 12px",
          fontFamily: "inherit",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          textAlign: "left",
          boxSizing: "border-box",
        }}
      >
        <span>{display || "DD/MM/YYYY"}</span>
        <span style={{ color: C.textMuted, fontSize: pick(13, 14), lineHeight: 1 }} aria-hidden>▾</span>
      </button>
      {open && !disabled && (
        <div
          className="apex-date-popover"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 6,
            zIndex: 1200,
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 10,
            boxShadow: "0 8px 32px #00000066",
            "--rdp-accent-color": C.accent,
            "--rdp-accent-background-color": C.accentDim,
            "--rdp-today-color": C.accent,
            "--rdp-day_button-border-radius": "8px",
            "--rdp-day-height": "36px",
            "--rdp-day-width": "36px",
            "--rdp-day_button-height": "34px",
            "--rdp-day_button-width": "34px",
          }}
        >
          <DayPicker
            mode="single"
            locale={enGB}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={selected || new Date()}
            onSelect={handleSelect}
            styles={{
              root: { color: C.text },
              caption_label: { color: C.text, fontSize: 14, fontWeight: 600 },
              weekday: { color: C.textSub, fontSize: 12 },
              day: { color: C.text },
              outside: { color: C.textMuted },
              disabled: { color: C.textMuted },
              button_previous: { color: C.textSub },
              button_next: { color: C.textSub },
            }}
          />
        </div>
      )}
      <style>{`
        .apex-date-popover .rdp-day_button:hover:not([disabled]) {
          background: ${C.surfaceL};
        }
        .apex-date-popover .rdp-selected .rdp-day_button {
          background: ${C.accent} !important;
          color: #fff !important;
          border-color: ${C.accent} !important;
        }
        .apex-date-popover .rdp-today:not(.rdp-selected) .rdp-day_button {
          border: 2px solid ${C.accent} !important;
          color: ${C.text};
        }
      `}</style>
    </div>
  );
}
