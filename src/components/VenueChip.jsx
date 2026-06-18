import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const C = {
  surfaceL: "#1E1E28",
  border: "#2A2A36",
  borderL: "#3A3A48",
  accent: "#7C5CFC",
  accentDim: "#7C5CFC22",
  amber: "#F5A623",
  amberDim: "#F5A62322",
  text: "#F0F0F8",
  textSub: "#8A8A9A",
};

export default function VenueChip({ venue, venues, onVenueChange, compact = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!ref.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!venues?.length || !onVenueChange) return null;

  const label = venue ? venue.name : t("common.allVenues");
  const maxLen = compact ? 14 : 22;
  const displayLabel = label.length > maxLen ? label.slice(0, maxLen) + "…" : label;
  const isAll = !venue;

  const pick = (id) => {
    onVenueChange(id);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title={t("common.changeVenue")}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? 4 : 6,
          padding: compact ? "4px 8px" : "6px 12px",
          borderRadius: 99,
          border: `1px solid ${isAll ? C.amber + "66" : C.accent + "55"}`,
          background: isAll ? C.amberDim : C.accentDim,
          color: isAll ? C.amber : C.accent,
          fontSize: compact ? 11 : 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
          maxWidth: compact ? 140 : 220,
          transition: "border-color 0.15s, background 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = isAll ? C.amber : C.accent; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = isAll ? C.amber + "66" : C.accent + "55"; }}
      >
        <span style={{ fontSize: compact ? 12 : 14, lineHeight: 1 }}>🏢</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayLabel}</span>
        <span style={{ fontSize: 9, opacity: 0.8, flexShrink: 0 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: compact ? 180 : 200,
            maxWidth: 280,
            background: C.surfaceL,
            border: `1px solid ${C.borderL}`,
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            zIndex: 400,
            overflow: "hidden",
            padding: 4,
          }}
        >
          <button
            type="button"
            role="option"
            aria-selected={isAll}
            onClick={() => pick("")}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "9px 12px",
              border: "none",
              borderRadius: 7,
              background: isAll ? C.amberDim : "transparent",
              color: isAll ? C.amber : C.text,
              fontSize: 13,
              fontWeight: isAll ? 600 : 400,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            onMouseEnter={e => { if (!isAll) e.currentTarget.style.background = "#2A2A36"; }}
            onMouseLeave={e => { e.currentTarget.style.background = isAll ? C.amberDim : "transparent"; }}
          >
            {t("common.allVenues")}
          </button>
          {venues.map(v => {
            const selected = venue?.id === v.id;
            return (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(v.id)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "9px 12px",
                  border: "none",
                  borderRadius: 7,
                  background: selected ? C.accentDim : "transparent",
                  color: selected ? C.accent : C.text,
                  fontSize: 13,
                  fontWeight: selected ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "#2A2A36"; }}
                onMouseLeave={e => { e.currentTarget.style.background = selected ? C.accentDim : "transparent"; }}
              >
                {v.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
