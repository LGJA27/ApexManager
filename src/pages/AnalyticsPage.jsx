import { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { buildReportHTML, buildExtendedInsights } from "./auditReport.js";

const C = {
  bg: "#0D0D12", surface: "#16161E", surfaceL: "#1E1E28", border: "#2A2A36",
  accent: "#7C5CFC", accentDim: "#7C5CFC22", green: "#22C97A", greenDim: "#22C97A22",
  amber: "#F5A623", red: "#F04060", blue: "#3B9EFF", text: "#F0F0F8",
  textSub: "#8A8A9A", textMuted: "#55556A",
};

const fmt = (n, dec = 2) => (typeof n === "number" ? n : parseFloat(n) || 0).toLocaleString("pt-PT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = n => `€${fmt(n)}`;
const today = () => new Date().toISOString().split("T")[0];
const monthLabel = d => { const [y, m] = d.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`; };
const dowShort = d => new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" });
const DOW_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

function exportCSV(filename, rows) {
  const esc = v => {
    const s = String(v ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob([rows.map(r => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function useTypeScale() {
  const w = useWindowWidth();
  const pick = (mobile, desktop) => (w >= 1024 ? desktop : w >= 768 ? Math.round((mobile + desktop) / 2) : mobile);
  return { w, isMobile: w < 768, isTablet: w >= 768 && w < 1024, isDesktop: w >= 1024, pick };
}

function pagePad(isMobile, isTablet) {
  if (isMobile) return "16px 16px";
  if (isTablet) return "22px 26px";
  return "28px 32px";
}

function Badge({ color = C.accent, children }) {
  const { pick } = useTypeScale();
  return <span style={{ background: color + "22", color, padding: "2px 8px", borderRadius: 99, fontSize: pick(11, 12), fontWeight: 600 }}>{children}</span>;
}

function Card({ children, style = {} }) {
  const { pick } = useTypeScale();
  return <div className="apex-card" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: pick(16, 18), ...style }}>{children}</div>;
}

function MetricCard({ label, value, sub, color = C.accent, icon, hideIcon }) {
  const { pick } = useTypeScale();
  return (
    <Card style={{ padding: pick(14, 16), minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: pick(11, 13), color: C.textSub, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: pick(18, 26), fontWeight: 700, color: C.text }}>{value}</div>
          {sub && <div style={{ fontSize: pick(11, 12), color, marginTop: 3 }}>{sub}</div>}
        </div>
        {icon && !hideIcon && <div style={{ fontSize: pick(18, 20), opacity: .7 }}>{icon}</div>}
      </div>
    </Card>
  );
}

function Btn({ onClick, children, variant = "primary", size = "md", style = {} }) {
  const { pick } = useTypeScale();
  const bg = variant === "ghost" ? "transparent" : variant === "green" ? C.green : C.accent;
  return (
    <button onClick={onClick} style={{ background: variant === "ghost" ? "transparent" : bg, color: variant === "ghost" ? C.textSub : "#fff", border: variant === "ghost" ? `1px solid ${C.border}` : "none", borderRadius: 8, padding: size === "sm" ? `${pick(6, 7)}px ${pick(12, 14)}px` : `${pick(8, 10)}px ${pick(16, 18)}px`, fontSize: pick(13, 14), fontWeight: 600, cursor: "pointer", ...style }}>
      {children}
    </button>
  );
}

function Input({ label, value, onChange, type = "text", style = {} }) {
  const { pick } = useTypeScale();
  return (
    <div style={style}>
      {label && <div style={{ fontSize: pick(12, 13), color: C.textSub, marginBottom: 5 }}>{label}</div>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: pick(14, 15), outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  const { pick } = useTypeScale();
  return (
    <div>
      {label && <div style={{ fontSize: pick(12, 13), color: C.textSub, marginBottom: 5 }}>{label}</div>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, padding: "8px 10px", fontSize: pick(14, 15), outline: "none" }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function EmptyState({ icon, title, sub }) {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px", color: C.textMuted }}>
      <div style={{ fontSize: 36, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{title}</div>
      {sub && <div style={{ fontSize: 13 }}>{sub}</div>}
    </div>
  );
}

function SectionHeading({ children, action }) {
  const { pick } = useTypeScale();
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pick(12, 16), marginTop: pick(24, 28), paddingTop: pick(24, 28), borderTop: `1px solid ${C.border}` }}>
      <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub, textTransform: "uppercase", letterSpacing: 0.8 }}>{children}</div>
      {action}
    </div>
  );
}

function ExpenseTypeChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const { pick } = useTypeScale();
  return (
    <div style={{ width: "100%" }}>
      {title && (
        <div style={{ fontSize: pick(12, 13), fontWeight: 600, color: C.textMuted, marginBottom: pick(10, 12), textTransform: "uppercase", letterSpacing: 0.6 }}>
          {title}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: pick(10, 12) }}>
        {data.map((d, i) => (
          <div key={i}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5, gap: 12 }}>
              <span style={{ fontSize: pick(12, 13), color: C.textSub, fontWeight: 600 }}>{d.label}</span>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: pick(12, 13), color: C.text, fontWeight: 600 }}>{fmtEur(d.value)}</span>
                <span style={{ fontSize: 10, color: C.textMuted, minWidth: 28, textAlign: "right" }}>{((d.value / total) * 100).toFixed(0)}%</span>
              </div>
            </div>
            <HorizBar pct={(d.value / max) * 100} color={d.color} height={pick(8, 10)} />
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizBar({ pct, color, height }) {
  const { pick } = useTypeScale();
  const h = height ?? pick(4, 5);
  return (
    <div style={{ height: h, background: C.border, borderRadius: 3, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3 }} />
    </div>
  );
}

// ─── CHART COMPONENTS ────────────────────────────────────────────────────────

function BarChart({ data, height = 120, color = C.accent, showLabels = true, showValues = true, average }) {
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState(null);
  useEffect(() => { setMounted(false); const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, [data]);
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  const avg = average ?? data.reduce((a, d) => a + d.value, 0) / data.length;
  const avgPct = (avg / max) * 100;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 3, height, paddingTop: showValues ? 18 : 0 }}>
        {average != null && (
          <div style={{ position: "absolute", left: 0, right: 0, bottom: `${avgPct}%`, borderTop: `1px dashed ${C.textMuted}`, zIndex: 1, pointerEvents: "none" }} title={`Avg: ${fmtEur(avg)}`} />
        )}
        {data.map((d, i) => {
          const pct = (d.value / max) * 100;
          const barColor = d.color || color;
          const above = d.value >= avg;
          const isHov = hover === i;
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative", zIndex: 2 }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {showValues && isHov && (
                <div style={{ position: "absolute", bottom: `calc(${mounted ? pct : 0}% + 4px)`, fontSize: 9, color: C.text, fontWeight: 600, whiteSpace: "nowrap", opacity: isHov ? 1 : 0, transition: "opacity .15s" }}>{fmtEur(d.value)}</div>
              )}
              <div title={`${d.label}: ${fmtEur(d.value)}`} style={{
                width: "100%", borderRadius: "3px 3px 0 0", cursor: "default",
                height: mounted ? `${pct}%` : "0%", minHeight: d.value > 0 && mounted ? 3 : 0,
                background: barColor, opacity: above ? 1 : 0.65,
                filter: isHov ? "brightness(1.25)" : "none",
                transition: "height 0.5s cubic-bezier(0.4, 0, 0.2, 1), filter 0.15s, opacity 0.15s",
              }} />
            </div>
          );
        })}
      </div>
      {showLabels && (
        <div style={{ display: "flex", gap: 3, marginTop: 6 }}>
          {data.map((d, i) => <span key={i} style={{ flex: 1, fontSize: 9, color: C.textMuted, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.label}</span>)}
        </div>
      )}
    </div>
  );
}

function MultiBarChart({ data, height = 140, series, colors, costOverlay }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(false); const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, [data]);
  if (!data?.length) return null;
  const max = Math.max(...data.flatMap(d => d.values), ...(costOverlay || []), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" }}>
        {series.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSub }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: colors[i] }} />{s}
          </div>
        ))}
        {costOverlay && <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSub }}><span style={{ width: 12, height: 2, background: C.red }} />Costs</div>}
      </div>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 6, height }}>
        {data.map((d, gi) => (
          <div key={gi} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative" }}>
            {costOverlay?.[gi] != null && (
              <div style={{ position: "absolute", left: 2, right: 2, bottom: `${(costOverlay[gi] / max) * 100}%`, borderTop: `2px solid ${C.red}`, zIndex: 3, pointerEvents: "none" }} title={`Costs: ${fmtEur(costOverlay[gi])}`} />
            )}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, width: "100%", height: "100%", justifyContent: "center" }}>
              {d.values.map((v, si) => (
                <div key={si} title={`${series[si]}: ${fmtEur(v)}`} style={{
                  flex: 1, maxWidth: 14, borderRadius: "2px 2px 0 0", background: colors[si],
                  height: mounted ? `${(v / max) * 100}%` : "0%", minHeight: v > 0 && mounted ? 2 : 0,
                  transition: "height 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
                }} />
              ))}
            </div>
            <span style={{ fontSize: 9, color: C.textMuted, marginTop: 4, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LineChart({ data, height = 140, color = C.accent, showDots = true, secondLine, secondColor = C.red }) {
  const pathRef = useRef(null);
  const path2Ref = useRef(null);
  const [anim, setAnim] = useState(false);
  const [tip, setTip] = useState(null);
  const w = 400;
  const h = height;
  const pad = { t: 12, r: 8, b: 4, l: 4 };
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.value), ...(secondLine || []), 1);
  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * (w - pad.l - pad.r),
    y: pad.t + (1 - d.value / max) * (h - pad.t - pad.b),
    ...d,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${h} L${pts[0].x},${h} Z`;
  const pts2 = secondLine ? data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * (w - pad.l - pad.r),
    y: pad.t + (1 - (secondLine[i] || 0) / max) * (h - pad.t - pad.b),
  })) : null;
  const line2 = pts2?.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  useEffect(() => {
    setAnim(false);
    const t = setTimeout(() => setAnim(true), 50);
    return () => clearTimeout(t);
  }, [data, secondLine]);

  const dashLen = pathRef.current?.getTotalLength?.() || 1000;

  return (
    <div style={{ position: "relative" }}>
      {secondLine && (
        <div style={{ display: "flex", gap: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSub }}><span style={{ width: 12, height: 2, background: color }} />Revenue</div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.textSub }}><span style={{ width: 12, height: 2, background: secondColor }} />Costs</div>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {!secondLine && <path d={area} fill="url(#lineGrad)" opacity={anim ? 1 : 0} style={{ transition: "opacity 0.8s ease" }} />}
        {line2 && (
          <path ref={path2Ref} d={line2} fill="none" stroke={secondColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            strokeDasharray={dashLen} strokeDashoffset={anim ? 0 : dashLen} style={{ transition: "stroke-dashoffset 1s ease" }} />
        )}
        <path ref={pathRef} d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={dashLen} strokeDashoffset={anim ? 0 : dashLen} style={{ transition: "stroke-dashoffset 1s ease" }} />
        {showDots && pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={tip === i ? 5 : 3.5} fill={color} stroke={C.surface} strokeWidth="1.5" style={{ cursor: "default" }}
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)} />
        ))}
      </svg>
      {tip != null && (
        <div style={{ position: "absolute", top: 0, right: 0, background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 6, padding: "4px 8px", fontSize: 11, color: C.text, pointerEvents: "none" }}>
          {pts[tip].label}: {fmtEur(pts[tip].value)}
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
        {data.filter((_, i) => i === 0 || i === data.length - 1 || i % Math.max(1, Math.floor(data.length / 6)) === 0).map((d, i) => (
          <span key={i} style={{ fontSize: 9, color: C.textMuted }}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}

function RevenueSplitDetails({ segments }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const segs = segments.filter(s => s.value > 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 14 }}>
      {segs.map((seg, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: seg.color, flexShrink: 0 }} />
          <span style={{ color: C.textSub, flex: 1 }}>{seg.label}</span>
          <span style={{ color: C.text, fontWeight: 600 }}>{fmtEur(seg.value)}</span>
          <span style={{ color: C.textMuted, fontSize: 10, minWidth: 32, textAlign: "right" }}>{((seg.value / total) * 100).toFixed(0)}%</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalRevenueStack({ revenue, segments, height = 28 }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(false); const t = requestAnimationFrame(() => setMounted(true)); return () => cancelAnimationFrame(t); }, [segments]);
  const base = revenue || 1;
  const segs = segments.filter(s => s.value > 0);
  return (
    <div>
      <div style={{ display: "flex", height, borderRadius: 6, overflow: "hidden", background: C.border }}>
        {segs.map((seg, i) => (
          <div key={i} title={`${seg.label}: ${fmtEur(seg.value)}`} style={{
            width: mounted ? `${(seg.value / base) * 100}%` : "0%", background: seg.color, minWidth: seg.value > 0 && mounted ? 2 : 0,
            transition: `width 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${i * 0.08}s`,
          }} />
        ))}
      </div>
    </div>
  );
}

function HeatMap({ data, rowLabels, colLabels, cellSize = 22 }) {
  const rows = rowLabels || Object.keys(data);
  const colCount = colLabels?.length || (rows.length ? data[rows[0]]?.length || 0 : 0);
  const allVals = rows.flatMap(r => data[r] || []);
  const max = Math.max(...allVals, 1);
  let cellIdx = 0;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "inline-grid", gridTemplateColumns: `36px repeat(${colCount}, ${cellSize}px)`, gap: 2, alignItems: "center" }}>
        <div />
        {(colLabels || Array.from({ length: colCount }, (_, i) => i + 1)).map((c, i) => (
          <div key={i} style={{ fontSize: 9, color: C.textMuted, textAlign: "center", lineHeight: 1.1 }}>{c}</div>
        ))}
        {rows.map(row => (
          <Fragment key={row}>
            <div style={{ fontSize: 10, color: C.textSub, lineHeight: 1 }}>{typeof row === "string" ? row : rowLabels?.[row] || row}</div>
            {(data[row] || []).map((v, ci) => {
              const idx = cellIdx++;
              const intensity = v / max;
              const delay = Math.min(idx * 5, 500);
              return (
                <div key={`${row}-${ci}`} title={`${row} · ${colLabels?.[ci] || ci + 1}: ${typeof v === "number" ? fmtEur(v) : v}`}
                  style={{
                    width: cellSize, height: cellSize, borderRadius: 2,
                    background: v > 0 ? `rgba(124, 92, 252, ${0.15 + intensity * 0.85})` : C.border,
                    animation: `heatmapFade 0.3s ease ${delay}ms both`,
                  }} />
              );
            })}
          </Fragment>
        ))}
      </div>
      <style>{`@keyframes heatmapFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function StaffAttendanceGrid({ staffRows, weeks, getCellStatus }) {
  let cellIdx = 0;
  return (
    <div style={{ overflowX: "auto" }}>
      <div style={{ display: "grid", gridTemplateColumns: `100px repeat(${weeks.length}, 12px)`, gap: 3, alignItems: "center" }}>
        <div />
        {weeks.map((w, i) => <div key={i} style={{ fontSize: 8, color: C.textMuted, textAlign: "center", writingMode: weeks.length > 8 ? "vertical-rl" : undefined }}>{w.label}</div>)}
        {staffRows.map(member => (
          <Fragment key={member.id}>
            <div style={{ fontSize: 11, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{member.name}</div>
            {weeks.map((w, wi) => {
              const status = getCellStatus(member, w);
              const bg = status === "worked" ? C.green : status === "absent" ? C.red : C.border;
              const idx = cellIdx++;
              return (
                <div key={`${member.id}-${wi}`} title={`${member.name} · ${w.label}: ${status}`}
                  style={{
                    width: 10, height: 10, borderRadius: 2, background: bg,
                    animation: `heatmapFade 0.25s ease ${Math.min(idx * 5, 500)}ms both`,
                  }} />
              );
            })}
          </Fragment>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10, color: C.textMuted }}>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.green, marginRight: 4, verticalAlign: "middle" }} />Worked</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.red, marginRight: 4, verticalAlign: "middle" }} />Absent</span>
        <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: C.border, marginRight: 4, verticalAlign: "middle" }} />No data</span>
      </div>
      <style>{`@keyframes heatmapFade { from { opacity: 0; } to { opacity: 1; } }`}</style>
    </div>
  );
}

function RevenueScatter({ sales }) {
  const [tip, setTip] = useState(null);
  const w = 400; const h = 120;
  const pad = { l: 24, r: 8, t: 8, b: 20 };
  const DOW_NUM = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const pts = sales.map(s => ({
    x: (DOW_NUM[dowShort(s.date)] || 1) + (((s.date.charCodeAt(8) || 0) % 10) / 30 - 0.15),
    y: (s.cash || 0) + (s.card || 0),
    date: s.date,
  }));
  const maxY = Math.max(...pts.map(p => p.y), 1);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {pts.map((p, i) => {
        const cx = pad.l + ((p.x - 0.5) / 7) * (w - pad.l - pad.r);
        const cy = pad.t + (1 - p.y / maxY) * (h - pad.t - pad.b);
        return (
          <circle key={i} cx={cx} cy={cy} r={tip === i ? 5 : 3.5} fill={C.accent} opacity={0.75}
            onMouseEnter={() => setTip(i)} onMouseLeave={() => setTip(null)} style={{ cursor: "default" }} />
        );
      })}
      {DOW_ORDER.map((d, i) => (
        <text key={d} x={pad.l + (i / 6) * (w - pad.l - pad.r)} y={h - 4} fontSize="8" fill={C.textMuted} textAnchor="middle">{d}</text>
      ))}
      {tip != null && (
        <text x={w - 8} y={12} fontSize="9" fill={C.text} textAnchor="end">{pts[tip].date}: {fmtEur(pts[tip].y)}</text>
      )}
    </svg>
  );
}

function Sparkline({ values, width = 60, height = 30, color = C.amber }) {
  const pathRef = useRef(null);
  const [anim, setAnim] = useState(false);
  useEffect(() => { setAnim(false); const t = setTimeout(() => setAnim(true), 80); return () => clearTimeout(t); }, [values]);
  if (!values?.length) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * width},${height - (v / max) * (height - 4) - 2}`).join(" L");
  const d = `M${pts}`;
  const len = pathRef.current?.getTotalLength?.() || 200;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <path ref={pathRef} d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        strokeDasharray={len} strokeDashoffset={anim ? 0 : len} style={{ transition: "stroke-dashoffset 0.8s ease" }} />
    </svg>
  );
}

function SortableTable({ headers, rows, sortKey, sortDir, onSort, colWidths }) {
  const { pick } = useTypeScale();
  const thStyle = { textAlign: "left", padding: "8px 10px", color: C.textMuted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, fontSize: pick(11, 12), cursor: onSort ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  const tdStyle = { padding: "8px 10px", fontSize: pick(12, 13), color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
  return (
    <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed", fontSize: pick(12, 13) }}>
        {colWidths && <colgroup>{colWidths.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>}
        <thead>
          <tr>{headers.map((h, i) => (
            <th key={i} style={thStyle} onClick={() => onSort && h.key && onSort(h.key)}>
              {h.label}{sortKey === h.key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
            </th>
          ))}</tr>
        </thead>
        <tbody>{rows.map((row, ri) => (
          <tr key={ri}>{row.map((cell, ci) => (
            <td key={ci} style={{ ...tdStyle, ...(cell.style || {}), color: cell.color || tdStyle.color }}>{cell.content ?? cell}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function getQuickRange(key, sales) {
  const now = new Date();
  const to = today();
  if (key === "week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return { from: d.toISOString().slice(0, 10), to };
  }
  if (key === "month") return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to };
  if (key === "lastmonth") {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: d.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
  }
  if (key === "year") return { from: `${now.getFullYear()}-01-01`, to };
  const dates = sales.map(s => s.date).filter(Boolean).sort();
  return { from: dates[0] || to, to };
}

const AUDIT_OPTIONS = [
  { id: "sales", icon: "💳", title: "Sales Report", description: "Revenue, daily breakdown, day-of-week performance, monthly trends, cash vs card analysis" },
  { id: "expenses", icon: "💸", title: "Expenses Report", description: "Cost breakdown, supplier invoices, fixed expenses, pending payments, monthly cost trends" },
  { id: "staff", icon: "👥", title: "Staff Report", description: "Attendance tracking, days worked, revenue per shift, performance ranking, absence log" },
  { id: "full", icon: "📋", title: "Full Audit", description: "Complete business report — all sections above plus executive summary and key insights", fullHighlight: true },
];

function AuditModal({ open, onClose, sections, onToggle, onGenerate }) {
  if (!open) return null;
  const isFull = sections.includes("full");
  const individual = ["sales", "expenses", "staff"].filter(s => sections.includes(s));
  const allThree = individual.length === 3;

  let summary;
  if (!sections.length) summary = { text: "Select at least one section to continue", color: C.textMuted };
  else if (isFull || allThree) summary = { text: "Will include: Executive Summary + All Sections + Key Insights", color: C.accent };
  else summary = { text: "Will include: " + individual.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(", "), color: C.accent };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: "#16161E", border: "1px solid #2A2A36", borderRadius: 16, padding: 28, position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: C.textSub, fontSize: 22, cursor: "pointer", lineHeight: 1 }}>×</button>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#F0F0F8", marginBottom: 6 }}>Generate Audit Report</div>
        <div style={{ fontSize: 13, color: "#8A8A9A", marginBottom: 24 }}>Select the sections to include in your report</div>

        {AUDIT_OPTIONS.map(opt => {
          const selected = sections.includes(opt.id) || (opt.id !== "full" && isFull);
          return (
            <div key={opt.id} onClick={() => onToggle(opt.id)}
              style={{
                width: "100%", padding: 16, borderRadius: 10, marginBottom: 10, cursor: "pointer",
                border: `1px solid ${selected ? C.accent : opt.fullHighlight ? C.accent + "44" : C.border}`,
                background: selected ? C.accentDim : "transparent",
                display: "flex", alignItems: "center", gap: 14, position: "relative",
              }}>
              {selected && <span style={{ position: "absolute", top: 10, right: 12, color: C.accent, fontWeight: 700, fontSize: 14 }}>✓</span>}
              <span style={{ fontSize: 32, lineHeight: 1, flexShrink: 0 }}>{opt.icon}</span>
              <div>
                <div style={{ fontWeight: 700, color: C.text, fontSize: 14, marginBottom: 4 }}>{opt.title}</div>
                <div style={{ fontSize: 12, color: C.textSub, lineHeight: 1.45 }}>{opt.description}</div>
              </div>
            </div>
          );
        })}

        {allThree && !isFull && (
          <div style={{ fontSize: 12, color: C.accent, marginBottom: 12 }}>All sections selected — switching to Full Audit</div>
        )}

        <div style={{ fontSize: 12, color: summary.color, marginBottom: 20, minHeight: 18 }}>{summary.text}</div>

        <button
          disabled={!sections.length}
          onClick={onGenerate}
          style={{
            width: "100%", padding: "12px 20px", borderRadius: 10, border: "none",
            background: C.accent, color: "#fff", fontSize: 14, fontWeight: 600, cursor: sections.length ? "pointer" : "not-allowed",
            opacity: sections.length ? 1 : 0.4,
          }}
        >
          Generate Report →
        </button>
      </div>
    </div>
  );
}

export default function AnalyticsPage({ sales, expenses, invoices, venues, staff = [], suppliers = [], ingredients = [] }) {
  const { isMobile, isTablet, pick } = useTypeScale();
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(today);
  const [venueId, setVenueId] = useState("");
  const [tab, setTab] = useState("overview");
  const [salesSort, setSalesSort] = useState({ key: "date", dir: "desc" });
  const [staffSort, setStaffSort] = useState({ key: "worked", dir: "desc" });
  const [showAllSales, setShowAllSales] = useState(false);
  const [expandedStaff, setExpandedStaff] = useState(null);
  const [showMonthlyTable, setShowMonthlyTable] = useState(false);
  const [auditModal, setAuditModal] = useState(false);
  const [auditSections, setAuditSections] = useState([]);

  const matchVenue = item => !venueId || item.venue_id === venueId;
  const inDate = d => d && d >= from && d <= to;
  const paidAtDate = i => (i.paid_at ? i.paid_at.slice(0, 10) : i.date);

  const filteredSales = useMemo(() => sales.filter(s => inDate(s.date) && matchVenue(s)), [sales, from, to, venueId]);
  const filteredExp = useMemo(() => expenses.filter(e => inDate(e.date) && matchVenue(e)), [expenses, from, to, venueId]);
  const filteredInv = useMemo(() => invoices.filter(i => {
    if (!matchVenue(i)) return false;
    if (i.status === "paid") return inDate(paidAtDate(i));
    return inDate(i.date);
  }), [invoices, from, to, venueId]);
  const filteredStaff = useMemo(() => staff.filter(s => !venueId || !s.venue_id || s.venue_id === venueId), [staff, venueId, venueId]);

  const totalCash = filteredSales.reduce((a, s) => a + (s.cash || 0), 0);
  const totalCard = filteredSales.reduce((a, s) => a + (s.card || 0), 0);
  const totalRevenue = totalCash + totalCard;
  const dailyCosts = filteredSales.reduce((a, s) => a + (s.cash_expenses || 0), 0);
  const fixedExp = filteredExp.reduce((a, e) => a + (e.amount || 0), 0);
  const paidInvoiceTotal = filteredInv.filter(i => i.status === "paid").reduce((a, i) => a + (i.total || 0), 0);
  const pendingInvoiceTotal = filteredInv.filter(i => i.status !== "paid").reduce((a, i) => a + (i.total || 0), 0);
  const invoiceTotalAll = paidInvoiceTotal + pendingInvoiceTotal;
  const totalCosts = fixedExp + paidInvoiceTotal + dailyCosts;
  const netProfit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue ? (netProfit / totalRevenue) * 100 : 0;
  const uniqueDays = new Set(filteredSales.map(s => s.date)).size;
  const avgDaily = uniqueDays ? totalRevenue / uniqueDays : 0;

  const dayTotals = filteredSales.reduce((acc, s) => {
    const t = (s.cash || 0) + (s.card || 0);
    if (!acc[s.date]) acc[s.date] = 0;
    acc[s.date] += t;
    return acc;
  }, {});
  const bestDayEntry = Object.entries(dayTotals).sort((a, b) => b[1] - a[1])[0];
  const worstDayEntry = Object.entries(dayTotals).sort((a, b) => a[1] - b[1]).find(([, v]) => v > 0);

  const pendingInv = filteredInv.filter(i => i.status === "pending");
  const paidInv = filteredInv.filter(i => i.status === "paid");
  const pendingAmt = pendingInv.reduce((a, i) => a + (i.total || 0), 0);
  const paidAmt = paidInv.reduce((a, i) => a + (i.total || 0), 0);

  const monthlyTrend = useMemo(() => {
    const m = {};
    filteredSales.forEach(s => {
      const mk = s.date.slice(0, 7);
      if (!m[mk]) m[mk] = { rev: 0, daily: 0, days: new Set() };
      m[mk].rev += (s.cash || 0) + (s.card || 0);
      m[mk].daily += s.cash_expenses || 0;
      m[mk].days.add(s.date);
    });
    filteredExp.forEach(e => { const mk = e.date.slice(0, 7); if (!m[mk]) m[mk] = { rev: 0, daily: 0, days: new Set(), fixed: 0 }; m[mk].fixed = (m[mk].fixed || 0) + (e.amount || 0); });
    filteredInv.forEach(i => {
      const mk = (i.status === "paid" ? paidAtDate(i) : i.date).slice(0, 7);
      if (!m[mk]) m[mk] = { rev: 0, daily: 0, days: new Set(), fixed: 0, inv: 0 };
      if (i.status === "paid") m[mk].inv = (m[mk].inv || 0) + (i.total || 0);
    });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([mk, v]) => {
      const costs = (v.daily || 0) + (v.fixed || 0) + (v.inv || 0);
      const profit = v.rev - costs;
      return { month: monthLabel(mk + "-01"), revenue: v.rev, costs, profit, margin: v.rev ? ((profit / v.rev) * 100).toFixed(1) + "%" : "—", days: v.days?.size || 0 };
    });
  }, [filteredSales, filteredExp, filteredInv]);

  const dowStats = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const d = dowShort(s.date);
      if (!map[d]) map[d] = { total: 0, count: 0, dates: new Set() };
      map[d].total += (s.cash || 0) + (s.card || 0);
      map[d].count++;
      map[d].dates.add(s.date);
    });
    return DOW_ORDER.filter(d => map[d]).map(d => ({
      day: d, count: map[d].count, total: map[d].total, avg: map[d].total / map[d].count,
    }));
  }, [filteredSales]);

  const bestDow = dowStats.length ? dowStats.reduce((b, d) => d.avg > b.avg ? d : b) : null;
  const worstDow = dowStats.length ? dowStats.reduce((b, d) => d.avg < b.avg ? d : b) : null;

  const monthlySales = useMemo(() => {
    const m = {};
    filteredSales.forEach(s => {
      const mk = s.date.slice(0, 7);
      if (!m[mk]) m[mk] = { cash: 0, card: 0, daily: 0, days: new Set() };
      m[mk].cash += s.cash || 0;
      m[mk].card += s.card || 0;
      m[mk].daily += s.cash_expenses || 0;
      m[mk].days.add(s.date);
    });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([mk, v]) => ({
      month: monthLabel(mk + "-01"), days: v.days.size, cash: v.cash, card: v.card,
      total: v.cash + v.card, daily: v.daily, net: v.cash + v.card - v.daily,
    }));
  }, [filteredSales]);

  const staffReport = useMemo(() => {
    const loggedDays = [...new Set(filteredSales.map(s => s.date))];
    const totalLogged = loggedDays.length;
    return filteredStaff.map(m => {
      const workedDays = filteredSales.filter(s => (s.staff || []).includes(m.name));
      const worked = workedDays.length;
      const missed = Math.max(0, totalLogged - worked);
      const rate = totalLogged ? (worked / totalLogged) * 100 : 0;
      const rev = workedDays.reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
      const monthly = {};
      workedDays.forEach(s => {
        const mk = s.date.slice(0, 7);
        if (!monthly[mk]) monthly[mk] = { days: 0, rev: 0 };
        monthly[mk].days++;
        monthly[mk].rev += (s.cash || 0) + (s.card || 0);
      });
      return { ...m, worked, missed, rate, rev, avgShift: worked ? rev / worked : 0, monthly: Object.entries(monthly).sort((a, b) => b[0].localeCompare(a[0])) };
    });
  }, [filteredStaff, filteredSales]);

  const activeStaff = filteredStaff.filter(s => s.status === "active" || !s.status);
  const fullTeamDays = useMemo(() => {
    if (!activeStaff.length) return 0;
    const names = activeStaff.map(s => s.name);
    return filteredSales.filter(s => names.every(n => (s.staff || []).includes(n))).length;
  }, [filteredSales, activeStaff]);

  const supplierRankings = useMemo(() => {
    const map = {};
    filteredInv.forEach(i => {
      const n = i.supplier_name || "Unknown";
      if (!map[n]) map[n] = { name: n, count: 0, paid: 0, pending: 0, spend: 0, pendingAmt: 0, dates: [] };
      map[n].count++;
      map[n].spend += i.total || 0;
      map[n].dates.push(i.status === "paid" ? paidAtDate(i) : i.date);
      if (i.status === "paid") { map[n].paid++; } else { map[n].pending++; map[n].pendingAmt += i.total || 0; }
    });
    return Object.values(map).sort((a, b) => b.spend - a.spend).map((s, i) => ({
      ...s, rank: i + 1, avg: s.count ? s.spend / s.count : 0, lastDate: s.dates.sort().reverse()[0] || "—",
    }));
  }, [filteredInv]);

  const monthlyCosts = useMemo(() => {
    const m = {};
    filteredExp.forEach(e => {
      const mk = e.date.slice(0, 7);
      if (!m[mk]) m[mk] = { fixed: 0, inv: 0, daily: 0, rev: 0 };
      m[mk].fixed += e.amount || 0;
    });
    filteredInv.forEach(i => {
      const mk = (i.status === "paid" ? paidAtDate(i) : i.date).slice(0, 7);
      if (!m[mk]) m[mk] = { fixed: 0, inv: 0, pendingInv: 0, daily: 0, rev: 0 };
      if (i.status === "paid") m[mk].inv += i.total || 0;
      else m[mk].pendingInv = (m[mk].pendingInv || 0) + (i.total || 0);
    });
    filteredSales.forEach(s => {
      const mk = s.date.slice(0, 7);
      if (!m[mk]) m[mk] = { fixed: 0, inv: 0, daily: 0, rev: 0 };
      m[mk].daily += s.cash_expenses || 0;
      m[mk].rev += (s.cash || 0) + (s.card || 0);
    });
    return Object.entries(m).sort((a, b) => b[0].localeCompare(a[0])).map(([mk, v]) => {
      const total = v.fixed + v.inv + v.daily;
      const vsRev = v.rev ? (total / v.rev) * 100 : 0;
      return { month: monthLabel(mk + "-01"), fixed: v.fixed, inv: v.inv, pendingInv: v.pendingInv || 0, daily: v.daily, total, rev: v.rev, vsRev };
    });
  }, [filteredExp, filteredInv, filteredSales]);

  const expTypes = ["SERVICES", "WAGES", "RENT", "OTHER"];
  const typeColors = { SERVICES: C.blue, WAGES: C.amber, RENT: C.red, OTHER: C.textSub };

  const teamByDow = useMemo(() => {
    const map = {};
    filteredSales.forEach(s => {
      const d = dowShort(s.date);
      if (!map[d]) map[d] = { staff: {}, total: 0, count: 0 };
      map[d].total += (s.cash || 0) + (s.card || 0);
      map[d].count++;
      (s.staff || []).forEach(name => { map[d].staff[name] = (map[d].staff[name] || 0) + 1; });
    });
    return DOW_ORDER.filter(d => map[d]).map(d => {
      const top = Object.entries(map[d].staff).sort((a, b) => b[1] - a[1])[0];
      return { day: d, topStaff: top ? top[0] : "—", avgRev: map[d].total / map[d].count, count: map[d].count };
    });
  }, [filteredSales]);

  const insights = useMemo(() => {
    const list = [];
    if (bestDow) list.push(`Best performing day of the week: ${bestDow.day} with avg ${fmtEur(bestDow.avg)}`);
    if (monthlyTrend[0]) list.push(`Highest revenue month in range: ${monthlyTrend[0].month} at ${fmtEur(monthlyTrend[0].revenue)}`);
    const topStaff = [...staffReport].sort((a, b) => b.rate - a.rate)[0];
    if (topStaff) list.push(`Most reliable staff member: ${topStaff.name} with ${topStaff.rate.toFixed(0)}% attendance`);
    if (supplierRankings[0]) {
      const pct = totalCosts ? ((supplierRankings[0].spend / totalCosts) * 100).toFixed(0) : 0;
      list.push(`Largest supplier: ${supplierRankings[0].name} representing ${pct}% of tracked spend`);
    }
    list.push(`Cost ratio: ${totalRevenue ? ((totalCosts / totalRevenue) * 100).toFixed(1) : 0}% of revenue spent on costs`);
    if (profitMargin < 20 && totalRevenue) list.push("⚠ Profit margin is below 20% — review costs to improve profitability");
    const overdue = pendingInv.filter(i => i.due_date && i.due_date < today());
    if (overdue.length) list.push(`⚠ ${overdue.length} invoice(s) are past due date`);
    staffReport.filter(s => s.rate < 70 && s.rate > 0).forEach(s => list.push(`⚠ ${s.name} has low attendance (${s.rate.toFixed(0)}%)`));
    return list;
  }, [bestDow, monthlyTrend, staffReport, supplierRankings, totalCosts, totalRevenue, profitMargin, pendingInv]);

  const toggleAuditSection = (id) => {
    if (id === "full") {
      setAuditSections(prev => (prev.includes("full") ? [] : ["full"]));
      return;
    }
    setAuditSections(prev => {
      let next = prev.filter(s => s !== "full");
      if (next.includes(id)) next = next.filter(s => s !== id);
      else next = [...next, id];
      if (["sales", "expenses", "staff"].every(s => next.includes(s))) return ["full"];
      return next;
    });
  };

  const generateAudit = (sections) => {
    const includeSales = sections.includes("sales") || sections.includes("full");
    const includeExpenses = sections.includes("expenses") || sections.includes("full");
    const includeStaff = sections.includes("staff") || sections.includes("full");
    const includeFull = sections.includes("full");

    const titles = [];
    if (includeSales && !includeFull) titles.push("Sales");
    if (includeExpenses && !includeFull) titles.push("Expenses");
    if (includeStaff && !includeFull) titles.push("Staff");
    const reportTitle = includeFull ? "Full Business Audit" : titles.join(" & ") + " Report";

    const venueName = venueId ? venues.find(v => v.id === venueId)?.name || "Selected Venue" : "All Venues";
    const reportInsights = includeFull
      ? buildExtendedInsights(insights, {
          paidAmt, totalRevenue, monthlyTrend, filteredSales, filteredExp, totalCash, totalCard,
        }, fmtEur, monthLabel)
      : insights;

    const html = buildReportHTML({
      reportTitle, venueName, from, to, today,
      includeSales, includeExpenses, includeStaff, includeFull,
      totalRevenue, totalCash, totalCard, totalCosts, netProfit, profitMargin,
      avgDaily, uniqueDays, dailyCosts, fixedExp, paidAmt, pendingAmt,
      paidInv, pendingInv, dowStats, bestDow, worstDow, monthlyTrend, monthlySales,
      monthlyCosts, staffReport, filteredStaff, fullTeamDays, supplierRankings,
      filteredExp, filteredInv, filteredSales, suppliers, insights: reportInsights,
      bestDayEntry, worstDayEntry, monthLabel,
    }, fmtEur, dowShort);

    const win = window.open("", "_blank");
    if (win) { win.document.write(html); win.document.close(); }
    setAuditModal(false);
  };

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "sales", label: "Sales" },
    { id: "expenses", label: "Expenses" },
    { id: "staff", label: "Staff" },
  ];

  const metricsGrid = { display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(auto-fit,minmax(140px,1fr))", gap: isMobile ? 10 : pick(12, 14), marginBottom: pick(16, 20), width: "100%" };

  const sortedSalesLog = useMemo(() => {
    let rows = [...filteredSales];
    const { key, dir } = salesSort;
    rows.sort((a, b) => {
      let av, bv;
      if (key === "date") { av = a.date; bv = b.date; }
      else if (key === "total") { av = (a.cash || 0) + (a.card || 0); bv = (b.cash || 0) + (b.card || 0); }
      else if (key === "cash") { av = a.cash || 0; bv = b.cash || 0; }
      else { av = a[key] || 0; bv = b[key] || 0; }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return rows;
  }, [filteredSales, salesSort]);

  const toggleSalesSort = key => setSalesSort(p => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));
  const toggleStaffSort = key => setStaffSort(p => ({ key, dir: p.key === key && p.dir === "asc" ? "desc" : "asc" }));

  const sortedStaffReport = useMemo(() => {
    const rows = [...staffReport];
    const { key, dir } = staffSort;
    rows.sort((a, b) => {
      const av = a[key] ?? 0; const bv = b[key] ?? 0;
      return dir === "asc" ? av - bv : bv - av;
    });
    return rows;
  }, [staffReport, staffSort]);

  const hasData = filteredSales.length || filteredExp.length || filteredInv.length;

  const lineChartData = useMemo(() => {
    const days = Object.entries(dayTotals).sort((a, b) => a[0].localeCompare(b[0]));
    if (days.length <= 90) return days.map(([date, total]) => ({ label: date.slice(5), value: total }));
    const weeks = {};
    days.forEach(([date, total]) => {
      const d = new Date(date + "T12:00:00");
      const wk = d.toISOString().slice(0, 10).slice(0, 7) + "-W" + Math.ceil(d.getDate() / 7);
      weeks[wk] = (weeks[wk] || 0) + total;
    });
    return Object.entries(weeks).map(([label, value]) => ({ label: label.slice(-3), value }));
  }, [dayTotals]);

  const revenueStackSegments = useMemo(() => [
    { label: "Daily costs", value: dailyCosts, color: C.amber },
    { label: "Fixed expenses", value: fixedExp, color: C.red },
    { label: "Paid invoices", value: paidInvoiceTotal, color: C.blue },
    { label: "Net profit", value: Math.max(0, netProfit), color: C.green },
  ], [dailyCosts, fixedExp, paidInvoiceTotal, netProfit]);

  const monthlyChartData = useMemo(() =>
    [...monthlyTrend].reverse().map(m => ({ label: m.month.slice(0, 3), values: [m.revenue, m.costs] })),
  [monthlyTrend]);

  const monthlySalesChart = useMemo(() =>
    [...monthlySales].reverse().map(m => ({ label: m.month.slice(0, 3), values: [m.cash, m.card] })),
  [monthlySales]);

  const monthlySalesCosts = useMemo(() => [...monthlySales].reverse().map(m => m.daily + (monthlyCosts.find(c => c.month === m.month)?.fixed || 0) + (monthlyCosts.find(c => c.month === m.month)?.inv || 0)), [monthlySales, monthlyCosts]);

  const dowBarData = useMemo(() => DOW_ORDER.map(d => {
    const stat = dowStats.find(x => x.day === d);
    const avg = stat?.avg || 0;
    let barColor = C.accent;
    if (d === bestDow?.day) barColor = C.green;
    if (d === worstDow?.day && avg > 0) barColor = C.red;
    return { label: d, value: avg, color: barColor };
  }), [dowStats, bestDow, worstDow]);

  const dowAvg = dowStats.length ? dowStats.reduce((a, d) => a + d.avg, 0) / dowStats.length : 0;

  const expTypeLabels = { SERVICES: "Services", WAGES: "Wages", RENT: "Rent", OTHER: "Other" };
  const expTypeBarData = useMemo(() => expTypes.map(type => ({
    label: expTypeLabels[type] || type,
    value: filteredExp.filter(e => e.type === type).reduce((a, e) => a + (e.amount || 0), 0),
    color: typeColors[type],
  })).filter(d => d.value > 0), [filteredExp]);

  const costMixData = useMemo(() => [
    { label: "Expenses", value: fixedExp, color: C.red },
    { label: "Daily Costs", value: dailyCosts, color: C.amber },
    { label: "Paid Invoices", value: paidInvoiceTotal, color: C.blue },
  ].filter(d => d.value > 0), [fixedExp, dailyCosts, paidInvoiceTotal]);

  const expensesLineData = useMemo(() => {
    const chron = [...monthlyCosts].reverse();
    return {
      labels: chron.map(m => m.month.slice(0, 3)),
      revenue: chron.map(m => m.rev),
      costs: chron.map(m => m.total),
    };
  }, [monthlyCosts]);

  const staffWeekBlocks = useMemo(() => {
    const dates = [...new Set(filteredSales.map(s => s.date))].sort();
    if (!dates.length) return [];
    const weeks = [];
    let cur = new Date(dates[0] + "T12:00:00");
    cur.setDate(cur.getDate() - ((cur.getDay() + 6) % 7));
    const last = new Date(dates[dates.length - 1] + "T12:00:00");
    let wi = 1;
    while (cur <= last) {
      const wEnd = new Date(cur); wEnd.setDate(wEnd.getDate() + 6);
      const wStart = cur.toISOString().slice(0, 10);
      const wEndStr = wEnd.toISOString().slice(0, 10);
      const weekDates = dates.filter(d => d >= wStart && d <= wEndStr);
      weeks.push({ label: `W${wi}`, dates: weekDates });
      cur.setDate(cur.getDate() + 7);
      wi++;
    }
    return weeks;
  }, [filteredSales]);

  const getStaffCellStatus = (member, week) => {
    if (!week.dates.length) return "none";
    let worked = 0;
    week.dates.forEach(d => {
      const sale = filteredSales.find(s => s.date === d);
      if (sale && (sale.staff || []).includes(member.name)) worked++;
    });
    if (worked === 0) return "absent";
    if (worked >= week.dates.length) return "worked";
    return "absent";
  };

  const staffRevenueBars = useMemo(() =>
    [...staffReport].sort((a, b) => b.rev - a.rev).slice(0, 12).map(s => ({ label: s.name.split(" ")[0], value: s.rev, color: C.accent })),
  [staffReport]);

  const supplierSparkData = useMemo(() => {
    const map = {};
    filteredInv.forEach(i => {
      const n = i.supplier_name || "Unknown";
      if (!map[n]) map[n] = [];
      map[n].push({ date: i.status === "paid" ? paidAtDate(i) : i.date, total: i.total || 0 });
    });
    return Object.fromEntries(Object.entries(map).map(([n, arr]) =>
      [n, arr.sort((a, b) => a.date.localeCompare(b.date)).map(x => x.total)]));
  }, [filteredInv]);

  const heatmapDowData = useMemo(() => {
    const weeks = staffWeekBlocks.length || 4;
    const out = {};
    DOW_ORDER.forEach(d => {
      out[d] = Array.from({ length: weeks }, (_, wi) => {
        const w = staffWeekBlocks[wi];
        if (!w) return 0;
        return w.dates.filter(date => dowShort(date) === d).reduce((a, date) => {
          const s = filteredSales.find(x => x.date === date);
          return a + (s ? (s.cash || 0) + (s.card || 0) : 0);
        }, 0);
      });
    });
    return out;
  }, [staffWeekBlocks, filteredSales]);

  return (
    <div style={{ padding: pagePad(isMobile, isTablet), width: "100%", boxSizing: "border-box" }}>
      {!isMobile && <h1 style={{ margin: "0 0 20px", fontSize: pick(22, 28), color: C.text }}>Analytics & Reports</h1>}

      {/* Filter bar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: pick(12, 14), alignItems: "flex-end", marginBottom: pick(16, 20), width: "100%" }}>
        <Input label="From" type="date" value={from} onChange={setFrom} style={{ flex: isMobile ? "1 1 100%" : "0 0 140px" }} />
        <Input label="To" type="date" value={to} onChange={setTo} style={{ flex: isMobile ? "1 1 100%" : "0 0 140px" }} />
        {venues.length > 0 && (
          <div style={{ flex: isMobile ? "1 1 100%" : "0 0 160px" }}>
            <Select label="Venue" value={venueId} onChange={setVenueId}
              options={[{ value: "", label: "All Venues" }, ...venues.map(v => ({ value: v.id, label: v.name }))]} />
          </div>
        )}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", flex: 1 }}>
          {[["week", "This Week"], ["month", "This Month"], ["lastmonth", "Last Month"], ["year", "This Year"], ["all", "All Time"]].map(([k, l]) => (
            <button key={k} onClick={() => { const r = getQuickRange(k, sales); setFrom(r.from); setTo(r.to); }}
              style={{ padding: `${pick(7, 8)}px ${pick(12, 16)}px`, borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.textSub, fontSize: pick(12, 13), cursor: "pointer", whiteSpace: "nowrap" }}>{l}</button>
          ))}
        </div>
        <Btn onClick={() => { setAuditSections([]); setAuditModal(true); }} style={{ marginLeft: "auto", flexShrink: 0 }}>📋 Audit Report</Btn>
      </div>

      <AuditModal
        open={auditModal}
        onClose={() => setAuditModal(false)}
        sections={auditSections}
        onToggle={toggleAuditSection}
        onGenerate={() => generateAudit(auditSections)}
      />

      {/* Tabs */}
      <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: 20, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: `${pick(8, 10)}px ${pick(16, 18)}px`, borderRadius: 99, border: `1px solid ${tab === t.id ? C.accent : C.border}`, background: tab === t.id ? C.accentDim : "transparent", color: tab === t.id ? C.accent : C.textSub, fontSize: pick(13, 14), fontWeight: tab === t.id ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
            {t.label}
          </button>
        ))}
      </div>

      {!hasData && <EmptyState icon="📈" title="No data in this range" sub="Adjust the date range or log sales and expenses." />}

      {/* OVERVIEW TAB */}
      {hasData && tab === "overview" && (
        <>
          <div style={metricsGrid}>
            <MetricCard label="Total Revenue" value={fmtEur(totalRevenue)} color={C.green} icon="💰" hideIcon={isMobile} />
            <MetricCard label="Total Costs" value={fmtEur(totalCosts)} color={C.red} icon="💸" hideIcon={isMobile} />
            <MetricCard label="Net Profit" value={fmtEur(netProfit)} color={netProfit >= 0 ? C.green : C.red} icon="📈" hideIcon={isMobile} />
            <MetricCard label="Profit Margin" value={totalRevenue ? profitMargin.toFixed(1) + "%" : "—"} color={C.accent} hideIcon={isMobile} />
            <MetricCard label="Avg Daily Revenue" value={fmtEur(avgDaily)} sub={`${uniqueDays} days`} color={C.blue} hideIcon={isMobile} />
            <MetricCard label="Best Single Day" value={bestDayEntry ? fmtEur(bestDayEntry[1]) : "—"} sub={bestDayEntry?.[0]} color={C.amber} hideIcon={isMobile} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 340px", gap: pick(14, 16), marginBottom: pick(16, 20) }}>
            <Card style={{ padding: pick(16, 20) }}>
              <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub, marginBottom: pick(12, 14) }}>Daily Revenue Trend</div>
              {lineChartData.length === 0 ? <div style={{ color: C.textMuted, fontSize: pick(13, 14) }}>No sales data.</div> : (
                <LineChart data={lineChartData} height={isMobile ? 100 : 140} color={C.accent} showDots={lineChartData.length <= 31} />
              )}
            </Card>
            <Card style={{ padding: pick(16, 20) }}>
              <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub, marginBottom: pick(12, 14) }}>Revenue Split</div>
              {totalRevenue > 0 ? (
                <>
                  <HorizontalRevenueStack revenue={totalRevenue} segments={revenueStackSegments} />
                  <RevenueSplitDetails segments={revenueStackSegments} />
                </>
              ) : (
                <div style={{ color: C.textMuted, fontSize: 13 }}>No revenue data.</div>
              )}
            </Card>
          </div>
          <Card style={{ marginBottom: pick(16, 20) }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: pick(12, 14) }}>
              <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub }}>Monthly Performance</div>
              <button onClick={() => setShowMonthlyTable(v => !v)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: pick(12, 13), fontWeight: 600 }}>
                {showMonthlyTable ? "Hide table" : "Show table"}
              </button>
            </div>
            {monthlyChartData.length > 0 ? (
              <MultiBarChart data={monthlyChartData} height={isMobile ? 120 : 160} series={["Revenue", "Costs"]} colors={[C.green, C.red]} />
            ) : <div style={{ color: C.textMuted, fontSize: 13 }}>No monthly data.</div>}
            {showMonthlyTable && (
              <div style={{ marginTop: 16, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <SortableTable
                  headers={[{ label: "Month" }, { label: "Revenue" }, { label: "Costs" }, { label: "Profit" }, { label: "Margin" }, { label: "Days" }]}
                  rows={monthlyTrend.map(m => [
                    { content: m.month },
                    { content: fmtEur(m.revenue), color: C.green },
                    { content: fmtEur(m.costs), color: C.red },
                    { content: fmtEur(m.profit), color: m.profit >= 0 ? C.green : C.red },
                    { content: m.margin },
                    { content: m.days },
                  ])}
                />
              </div>
            )}
          </Card>
        </>
      )}

      {/* SALES TAB */}
      {hasData && tab === "sales" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV("sales-report.csv", [
              ["Date", "Day", "Cash", "Card", "Total", "Daily Costs", "POS", "XPTO", "Staff", "Notes"],
              ...filteredSales.map(s => [s.date, dowShort(s.date), s.cash, s.card, (s.cash || 0) + (s.card || 0), s.cash_expenses, s.pos, s.xpto, (s.staff || []).join("; "), s.note || ""]),
            ])}>📥 Export Sales CSV</Btn>
          </div>
          <div style={metricsGrid}>
            <MetricCard label="Total Sales" value={fmtEur(totalRevenue)} color={C.green} hideIcon={isMobile} />
            <MetricCard label="Cash Sales" value={fmtEur(totalCash)} sub={totalRevenue ? ((totalCash / totalRevenue) * 100).toFixed(1) + "%" : ""} color={C.amber} hideIcon={isMobile} />
            <MetricCard label="Card Sales" value={fmtEur(totalCard)} sub={totalRevenue ? ((totalCard / totalRevenue) * 100).toFixed(1) + "%" : ""} color={C.blue} hideIcon={isMobile} />
            <MetricCard label="Daily Costs" value={fmtEur(dailyCosts)} color={C.red} hideIcon={isMobile} />
            <MetricCard label="Days Logged" value={uniqueDays} color={C.accent} hideIcon={isMobile} />
            <MetricCard label="Average / Day" value={fmtEur(avgDaily)} color={C.blue} hideIcon={isMobile} />
            <MetricCard label="Highest Day" value={bestDayEntry ? fmtEur(bestDayEntry[1]) : "—"} sub={bestDayEntry?.[0]} color={C.green} hideIcon={isMobile} />
            <MetricCard label="Lowest Day" value={worstDayEntry ? fmtEur(worstDayEntry[1]) : "—"} sub={worstDayEntry?.[0]} color={C.red} hideIcon={isMobile} />
          </div>
          <SectionHeading>Sales by Day of Week</SectionHeading>
          <Card>
            <BarChart data={dowBarData} height={isMobile ? 100 : 130} average={dowAvg} showValues />
          </Card>
          <SectionHeading>Monthly Breakdown</SectionHeading>
          <Card>
            {monthlySalesChart.length > 0 ? (
              <MultiBarChart data={monthlySalesChart} height={140} series={["Cash", "Card"]} colors={[C.amber, C.blue]} costOverlay={monthlySalesCosts} />
            ) : <div style={{ color: C.textMuted, fontSize: 13, padding: 12 }}>No monthly data.</div>}
          </Card>
          <SectionHeading>Revenue Distribution</SectionHeading>
          <Card>
            <div style={{ fontSize: pick(11, 12), color: C.textMuted, marginBottom: 8 }}>Each dot = one sales day · X = weekday · Y = revenue</div>
            {filteredSales.length > 0 ? <RevenueScatter sales={filteredSales} /> : <div style={{ color: C.textMuted, fontSize: 13 }}>No sales data.</div>}
          </Card>
          <SectionHeading action={sortedSalesLog.length > 50 && <Btn variant="ghost" size="sm" onClick={() => setShowAllSales(v => !v)}>{showAllSales ? "Show 50" : "Show all"}</Btn>}>Daily Sales Log</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable
              headers={[{ label: "Date", key: "date" }, { label: "Day" }, { label: "Cash", key: "cash" }, { label: "Card" }, { label: "Total", key: "total" }, { label: "Costs", key: "cash_expenses" }, { label: "POS" }, { label: "Staff" }]}
              sortKey={salesSort.key} sortDir={salesSort.dir} onSort={toggleSalesSort}
              rows={(showAllSales ? sortedSalesLog : sortedSalesLog.slice(0, 50)).map(s => [
                { content: s.date }, { content: dowShort(s.date) },
                { content: fmtEur(s.cash || 0), color: C.amber }, { content: fmtEur(s.card || 0), color: C.blue },
                { content: fmtEur((s.cash || 0) + (s.card || 0)), color: C.text, style: { fontWeight: 600 } },
                { content: fmtEur(s.cash_expenses || 0), color: C.red },
                { content: s.pos ? fmtEur(s.pos) : "—" },
                { content: (s.staff || []).join(", ") || "—", color: C.textSub },
              ])}
            />
          </Card>
        </>
      )}

      {/* EXPENSES TAB */}
      {tab === "expenses" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV("expenses-report.csv", [
              ["Date", "Name", "Type", "Amount", "Recurring", "Venue"],
              ...filteredExp.map(e => [e.date, e.name, e.type, e.amount, e.recurring ? "Yes" : "No", venues.find(v => v.id === e.venue_id)?.name || ""]),
            ])}>📥 Export Expenses CSV</Btn>
          </div>
          <div style={metricsGrid}>
            <MetricCard label="Expenses" value={fmtEur(fixedExp)} color={C.red} hideIcon={isMobile} />
            <MetricCard label="Daily Costs" value={fmtEur(dailyCosts)} color={C.red} hideIcon={isMobile} />
            <MetricCard label="Grand Total Costs" value={fmtEur(totalCosts)} color={C.red} hideIcon={isMobile} />
            <MetricCard label="Pending Invoices" value={fmtEur(pendingAmt)} color={C.amber} hideIcon={isMobile} />
            <MetricCard label="Paid Invoices" value={fmtEur(paidAmt)} color={C.green} hideIcon={isMobile} />
            <MetricCard label="Largest Expense" value={fmtEur(Math.max(...filteredExp.map(e => e.amount || 0), 0))} color={C.red} hideIcon={isMobile} />
          </div>
          <SectionHeading>Expenses by Type</SectionHeading>
          <Card>
            {expTypeBarData.length > 0 || costMixData.length > 0 ? (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: pick(24, 32), alignItems: "start" }}>
                {expTypeBarData.length > 0 ? (
                  <ExpenseTypeChart data={expTypeBarData} title="By Type" />
                ) : (
                  <div style={{ color: C.textMuted, fontSize: 13 }}>No expense data.</div>
                )}
                {costMixData.length > 0 && (
                  <ExpenseTypeChart data={costMixData} title="Total Cost Mix" />
                )}
              </div>
            ) : (
              <div style={{ color: C.textMuted, fontSize: 13 }}>No expense data.</div>
            )}
          </Card>
          <Card style={{ marginTop: 12, padding: 0, overflow: "hidden" }}>
            <SortableTable headers={[{ label: "Name" }, { label: "Type" }, { label: "Amount" }, { label: "Recurring" }, { label: "Date" }]}
              rows={filteredExp.map(e => [{ content: e.name }, { content: <Badge color={typeColors[e.type] || C.textSub}>{e.type}</Badge> }, { content: fmtEur(e.amount), color: C.red }, { content: e.recurring ? "Yes" : "No" }, { content: e.date }])} />
          </Card>
          <SectionHeading action={
            <Btn variant="ghost" size="sm" onClick={() => exportCSV("supplier-report.csv", [
              ["Supplier", "NIF", "IBAN", "Total Invoices", "Total Spend", "Pending Amount", "Paid Amount", "Last Invoice Date"],
              ...supplierRankings.map(s => {
                const sup = suppliers.find(x => x.name === s.name);
                const paidAmtS = filteredInv.filter(i => i.supplier_name === s.name && i.status === "paid").reduce((a, i) => a + (i.total || 0), 0);
                return [s.name, sup?.nif || "", sup?.iban || "", s.count, s.spend.toFixed(2), s.pendingAmt.toFixed(2), paidAmtS.toFixed(2), s.lastDate];
              }),
            ])}>📥 Export Suppliers CSV</Btn>
          }>Supplier Invoices</SectionHeading>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(3,1fr)", gap: pick(10, 12), marginBottom: pick(14, 16) }}>
            <MetricCard label="Total Suppliers" value={suppliers.length} color={C.accent} hideIcon={isMobile} />
            <MetricCard label="Active in Range" value={supplierRankings.length} color={C.blue} hideIcon={isMobile} />
            <MetricCard label="Top Supplier" value={supplierRankings[0]?.name?.slice(0, 14) || "—"} sub={supplierRankings[0] ? fmtEur(supplierRankings[0].spend) : ""} color={C.amber} hideIcon={isMobile} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {supplierRankings.length === 0 ? (
              <Card><div style={{ color: C.textMuted, fontSize: 13 }}>No supplier invoices in range.</div></Card>
            ) : supplierRankings.map(s => (
              <Card key={s.name} style={{ padding: pick(14, 16) }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.textMuted, lineHeight: 1, minWidth: 32 }}>#{s.rank}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: pick(14, 15), color: C.text, marginBottom: 8 }}>{s.name}</div>
                    <HorizBar pct={invoiceTotalAll ? (s.spend / invoiceTotalAll) * 100 : 0} color={C.amber} height={6} />
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: pick(12, 13) }}>
                      <span style={{ color: C.amber, fontWeight: 700 }}>{fmtEur(s.spend)}</span>
                      <span style={{ color: C.textSub }}>{s.count} invoices</span>
                      <span style={{ color: C.green }}>{s.paid} paid</span>
                      <span style={{ color: C.amber }}>{s.pending} pending</span>
                      <span style={{ color: C.textMuted, marginLeft: "auto" }}>Last: {s.lastDate}</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          {supplierRankings.some(s => (supplierSparkData[s.name]?.length || 0) > 2) && (
            <>
              <SectionHeading>Supplier Spend Over Time</SectionHeading>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 16 }}>
                {supplierRankings.filter(s => (supplierSparkData[s.name]?.length || 0) > 2).map(s => (
                  <Card key={s.name} style={{ padding: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                    <Sparkline values={supplierSparkData[s.name]} color={C.amber} />
                    <div style={{ fontSize: 10, color: C.textMuted, marginTop: 4 }}>{supplierSparkData[s.name].length} invoices</div>
                  </Card>
                ))}
              </div>
            </>
          )}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <Card>
              <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub, marginBottom: pick(12, 14) }}>Pending Invoices</div>
              {pendingInv.length === 0 ? <div style={{ color: C.textMuted, fontSize: pick(12, 13) }}>None pending.</div> : pendingInv.map(i => {
                const overdue = i.due_date && i.due_date < today();
                const dueSoon = i.due_date && !overdue && (new Date(i.due_date) - new Date()) / 86400000 <= 7;
                return (
                  <div key={i.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}`, background: overdue ? C.red + "11" : dueSoon ? C.amber + "11" : "transparent" }}>
                    <div style={{ fontWeight: 600, fontSize: pick(13, 14) }}>{i.supplier_name}</div>
                    <div style={{ fontSize: pick(12, 13), color: overdue ? C.red : C.amber }}>{fmtEur(i.total)} · Due {i.due_date || "—"} {overdue ? "(OVERDUE)" : ""}</div>
                  </div>
                );
              })}
            </Card>
            <Card>
              <div style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.textSub, marginBottom: pick(12, 14) }}>Recently Paid</div>
              {paidInv.slice(0, 10).map(i => (
                <div key={i.id} style={{ padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                  <div style={{ fontWeight: 600, fontSize: pick(13, 14) }}>{i.supplier_name}</div>
                  <div style={{ fontSize: pick(12, 13), color: C.green }}>{fmtEur(i.total)} · Paid {paidAtDate(i)}</div>
                </div>
              ))}
            </Card>
          </div>
          {ingredients.some(i => (i.price_history || []).length > 1) && (
            <>
              <SectionHeading>Ingredient Price Evolution</SectionHeading>
              <Card style={{ padding: 0, overflow: "hidden", marginBottom: 16 }}>
                <SortableTable headers={[{ label: "Ingredient" }, { label: "First Price" }, { label: "Latest" }, { label: "Change" }, { label: "Change %" }]}
                  rows={ingredients.filter(i => (i.price_history || []).length > 1).map(i => {
                    const hist = [...(i.price_history || [])].sort((a, b) => a.date.localeCompare(b.date));
                    const first = hist[0]?.price || 0;
                    const last = hist[hist.length - 1]?.price || 0;
                    const ch = last - first;
                    const pct = first ? ((ch / first) * 100).toFixed(1) : 0;
                    return [{ content: i.name }, { content: fmtEur(first) }, { content: fmtEur(last) }, { content: fmtEur(ch), color: ch <= 0 ? C.green : C.red }, { content: pct + "%", color: ch <= 0 ? C.green : C.red }];
                  })} />
              </Card>
            </>
          )}
          <SectionHeading>Monthly Cost Trend</SectionHeading>
          <Card style={{ marginBottom: 12 }}>
            {expensesLineData.labels.length > 0 ? (
              <LineChart
                data={expensesLineData.labels.map((l, i) => ({ label: l, value: expensesLineData.revenue[i] }))}
                secondLine={expensesLineData.costs}
                color={C.green}
                secondColor={C.red}
                height={140}
                showDots
              />
            ) : <div style={{ color: C.textMuted, fontSize: 13 }}>No monthly data.</div>}
          </Card>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable
              headers={[{ label: "Month" }, { label: "Expenses" }, { label: "Invoices Paid" }, { label: "Pending" }, { label: "Daily Costs" }, { label: "Total Costs" }, { label: "vs Revenue" }]}
              rows={monthlyCosts.map(m => [
                { content: m.month },
                { content: fmtEur(m.fixed), color: C.red },
                { content: fmtEur(m.inv), color: C.red },
                { content: fmtEur(m.pendingInv), color: C.amber },
                { content: fmtEur(m.daily), color: C.red },
                { content: fmtEur(m.total), color: C.red, style: { fontWeight: 600 } },
                { content: m.rev ? m.vsRev.toFixed(0) + "%" : "—", color: m.vsRev > 80 ? C.red : m.vsRev > 50 ? C.amber : C.green },
              ])}
            />
          </Card>
          <SectionHeading>All Invoices in Range</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable
              headers={[{ label: "Date" }, { label: "Due" }, { label: "Supplier" }, { label: "Invoice #" }, { label: "Net" }, { label: "Tax" }, { label: "Total" }, { label: "Status" }]}
              rows={filteredInv.map(i => {
                const overdue = i.status !== "paid" && i.due_date && i.due_date < today();
                const statusBadge = i.status === "paid"
                  ? <Badge color={C.green}>PAID</Badge>
                  : overdue
                    ? <Badge color={C.red}>OVERDUE</Badge>
                    : <Badge color={C.amber}>PENDING</Badge>;
                return [
                  { content: i.date }, { content: i.due_date || "—" }, { content: i.supplier_name },
                  { content: i.invoice_number ? `#${i.invoice_number}` : "—" },
                  { content: fmtEur(i.subtotal || 0) }, { content: fmtEur(i.tax || 0) }, { content: fmtEur(i.total || 0), color: C.amber },
                  { content: statusBadge },
                ];
              })}
            />
          </Card>
        </>
      )}

      {/* STAFF TAB */}
      {tab === "staff" && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <Btn variant="ghost" size="sm" onClick={() => exportCSV("staff-report.csv", [
              ["Name", "Job Title", "Status", "Phone", "Days Worked", "Days Missed", "Attendance %", "Revenue on Shifts", "Avg per Shift"],
              ...staffReport.map(s => [s.name, s.job_title || "", s.status, s.phone || "", s.worked, s.missed, s.rate.toFixed(1), s.rev.toFixed(2), s.avgShift.toFixed(2)]),
            ])}>📥 Export Staff Report CSV</Btn>
          </div>
          <div style={metricsGrid}>
            <MetricCard label="Total Staff" value={filteredStaff.length} color={C.accent} hideIcon={isMobile} />
            <MetricCard label="Active" value={filteredStaff.filter(s => s.status === "active" || !s.status).length} color={C.green} hideIcon={isMobile} />
            <MetricCard label="On Holidays" value={filteredStaff.filter(s => s.status === "holidays").length} color={C.amber} hideIcon={isMobile} />
            <MetricCard label="Sick Leave" value={filteredStaff.filter(s => s.status === "sick_leave").length} color={C.red} hideIcon={isMobile} />
            <MetricCard label="Part-Time" value={filteredStaff.filter(s => s.status === "part_time").length} color={C.blue} hideIcon={isMobile} />
            <MetricCard label="Full Team Days" value={fullTeamDays} color={C.green} hideIcon={isMobile} />
          </div>
          <SectionHeading>Attendance Heatmap</SectionHeading>
          <Card style={{ marginBottom: 16 }}>
            {staffWeekBlocks.length > 0 && filteredStaff.length > 0 ? (
              <StaffAttendanceGrid staffRows={filteredStaff} weeks={staffWeekBlocks} getCellStatus={getStaffCellStatus} />
            ) : <div style={{ color: C.textMuted, fontSize: 13 }}>No attendance data in range.</div>}
          </Card>
          <SectionHeading>Revenue Impact by Staff</SectionHeading>
          <Card style={{ marginBottom: 16 }}>
            {staffRevenueBars.length > 0 ? (
              <BarChart data={staffRevenueBars} height={130} color={C.green} />
            ) : <div style={{ color: C.textMuted, fontSize: 13 }}>No staff revenue data.</div>}
          </Card>
          {staffWeekBlocks.length > 0 && (
            <>
              <SectionHeading>Revenue by Day × Week</SectionHeading>
              <Card style={{ marginBottom: 16, padding: pick(12, 16) }}>
                <HeatMap data={heatmapDowData} rowLabels={DOW_ORDER} colLabels={staffWeekBlocks.map(w => w.label)} cellSize={isMobile ? 18 : 22} />
              </Card>
            </>
          )}
          <SectionHeading>Staff Attendance Report</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable
              headers={[{ label: "Name", key: "name" }, { label: "Job Title" }, { label: "Status" }, { label: "Worked", key: "worked" }, { label: "Missed", key: "missed" }, { label: "Attendance", key: "rate" }, { label: "Revenue", key: "rev" }, { label: "Avg/Shift", key: "avgShift" }]}
              sortKey={staffSort.key} sortDir={staffSort.dir} onSort={toggleStaffSort}
              rows={sortedStaffReport.map(s => [
                { content: s.name, style: { fontWeight: 600 } }, { content: s.job_title || "—" },
                { content: s.status || "active" },
                { content: s.worked }, { content: s.missed },
                { content: s.rate.toFixed(0) + "%", color: s.rate >= 90 ? C.green : s.rate >= 70 ? C.amber : C.red },
                { content: fmtEur(s.rev), color: C.green }, { content: fmtEur(s.avgShift) },
              ])}
            />
          </Card>
          {sortedStaffReport.map(s => (
            <div key={s.id} style={{ marginTop: 8 }}>
              <button onClick={() => setExpandedStaff(expandedStaff === s.id ? null : s.id)}
                style={{ width: "100%", textAlign: "left", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", color: C.textSub, fontSize: 12, cursor: "pointer" }}>
                {s.name} — monthly breakdown {expandedStaff === s.id ? "▴" : "▾"}
              </button>
              {expandedStaff === s.id && s.monthly.length > 0 && (
                <Card style={{ marginTop: 4, padding: 0, overflow: "hidden" }}>
                  <SortableTable headers={[{ label: "Month" }, { label: "Days Worked" }, { label: "Revenue" }]}
                    rows={s.monthly.map(([mk, v]) => [{ content: monthLabel(mk + "-01") }, { content: v.days }, { content: fmtEur(v.rev), color: C.green }])} />
                </Card>
              )}
            </div>
          ))}
          <SectionHeading>Absence Tracking</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable headers={[{ label: "Name" }, { label: "Status" }, { label: "From" }, { label: "Until" }, { label: "Duration" }]}
              rows={filteredStaff.filter(s => ["holidays", "sick_leave"].includes(s.status)).map(s => {
                const dur = s.status_from && s.status_until ? Math.ceil((new Date(s.status_until) - new Date(s.status_from)) / 86400000) + 1 : "—";
                return [{ content: s.name }, { content: <Badge color={s.status === "sick_leave" ? C.red : C.amber}>{s.status}</Badge> }, { content: s.status_from || "—" }, { content: s.status_until || "—" }, { content: dur + (dur !== "—" ? " days" : "") }];
              })} />
          </Card>
          <SectionHeading>Team Presence by Day of Week</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable headers={[{ label: "Weekday" }, { label: "Most Common Staff" }, { label: "Avg Revenue" }, { label: "Entries" }]}
              rows={teamByDow.map(r => [
                { content: r.day, style: { fontWeight: 600 } }, { content: r.topStaff },
                { content: fmtEur(r.avgRev), color: C.green }, { content: r.count },
              ])} />
          </Card>
          <SectionHeading>Best Performing Shifts</SectionHeading>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <SortableTable headers={[{ label: "Date" }, { label: "Day" }, { label: "Staff Present" }, { label: "Revenue" }]}
              rows={[...filteredSales].sort((a, b) => ((b.cash || 0) + (b.card || 0)) - ((a.cash || 0) + (a.card || 0))).slice(0, 10).map(s => [
                { content: s.date }, { content: dowShort(s.date) }, { content: (s.staff || []).join(", ") || "—", color: C.textSub },
                { content: fmtEur((s.cash || 0) + (s.card || 0)), color: C.green, style: { fontWeight: 600 } },
              ])} />
          </Card>
        </>
      )}

    </div>
  );
}
