import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return w;
}

/** Desktop type scale: mobile unchanged, tablet halfway, desktop bumped */
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

function pageTitleSize(isMobile, isTablet, isWide) {
  if (isMobile) return 19;
  if (isTablet) return 24;
  return isWide ? 30 : 28;
}

function filterByVenue(items, venue) {
  return venue ? items.filter(i => i.venue_id === venue.id) : items;
}

function computeVenuesWithLockStatus(venues, venueLimit) {
  if (venues.length <= venueLimit) {
    return venues.map(v => ({ ...v, isLocked: false }));
  }
  const sorted = [...venues].sort((a, b) =>
    new Date(b.last_used_at || b.created_at) - new Date(a.last_used_at || a.created_at)
  );
  const unlockedIds = new Set(sorted.slice(0, venueLimit).map(v => v.id));
  return venues.map(v => ({ ...v, isLocked: !unlockedIds.has(v.id) }));
}

function LockedVenuesBanner({ venuesWithLockStatus, onUpgrade }) {
  const { t } = useTranslation();
  const lockedCount = venuesWithLockStatus.filter(v => v.isLocked).length;
  if (lockedCount === 0) return null;
  return (
    <div style={{
      background: "linear-gradient(135deg, #F5A62311, #F5A62308)",
      border: "1px solid #F5A62344",
      borderRadius: 10,
      padding: "12px 16px",
      marginBottom: 16,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>🔒</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
            {t("venueLock.bannerTitle", { count: lockedCount })}
          </div>
          <div style={{ fontSize: 12, color: C.textSub }}>
            {t("venueLock.bannerSub")}
          </div>
        </div>
      </div>
      <button type="button" onClick={onUpgrade} style={{
        background: "linear-gradient(135deg, #7C5CFC, #5B2FD4)",
        border: "none", borderRadius: 7, color: "#fff",
        fontSize: 12, fontWeight: 700, padding: "7px 14px",
        cursor: "pointer", whiteSpace: "nowrap",
      }}>
        {t("venueLock.upgradeBtn")}
      </button>
    </div>
  );
}

function ScanLimitBanner({ isFree, scanLimit, onClose, manualEntryHint = true }) {
  return (
    <div style={{ background: "#F0406022", border: "1px solid #F0406044", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 13, color: C.red }}>
        {isFree ? (
          <>AI scanning isn&apos;t available on the Free plan. Upgrade to Starter for 30 scans/month{manualEntryHint ? ", or use manual entry below." : "."}</>
        ) : (
          <>You&apos;ve used all {scanLimit} AI scans for this month. Resets on the 1st, or upgrade for a higher limit.</>
        )}
      </span>
      <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
    </div>
  );
}

function formatScanLimit(limit) {
  return limit === 999999 ? "∞" : limit;
}

import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase, supabaseConfigured } from "./lib/supabase";
import Logo from "./components/Logo.jsx";
import TrialBanner from "./components/TrialBanner.jsx";
import PricingPage from "./pages/PricingPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import UpgradePrompt from "./components/UpgradePrompt.jsx";
import InstallAppButton from "./components/InstallAppButton.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";
import PageHeader from "./components/PageHeader.jsx";
import VenueChip from "./components/VenueChip.jsx";
import DateInput from "./components/DateInput.jsx";
import { useSubscriptionGate } from "./hooks/useSubscriptionGate.js";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfServicePage from "./pages/TermsOfServicePage.jsx";
import CookiePolicyPage from "./pages/CookiePolicyPage.jsx";
import { loadGoogleAnalytics, unloadGoogleAnalytics, trackPageview, trackEvent } from "./lib/analytics.js";
import { PLANS } from "./config/plans.js";

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
// Deep obsidian dark, electric violet accent, warm amber for revenue,
// crimson for expenses. Clean Inter + data-dense mono numerics.
const C = {
  bg:        "#0D0D12",
  surface:   "#16161E",
  surfaceL:  "#1E1E28",
  border:    "#2A2A36",
  borderL:   "#3A3A48",
  accent:    "#7C5CFC",
  accentDim: "#7C5CFC22",
  accentHov: "#9A7FFD",
  green:     "#22C97A",
  greenDim:  "#22C97A22",
  amber:     "#F5A623",
  amberDim:  "#F5A62322",
  red:       "#F04060",
  redDim:    "#F0406022",
  blue:      "#3B9EFF",
  blueDim:   "#3B9EFF22",
  text:      "#F0F0F8",
  textSub:   "#8A8A9A",
  textMuted: "#55556A",
};

const VENUE_TYPE_OPTIONS = [
  "Restaurant", "Bar/Café", "Bakery", "Takeaway", "Fine Dining",
  "Retail Shop", "Salon/Spa", "Clinic/Practice", "Office/Studio",
  "Other",
];

// ─── CLAUDE API (proxied through /api/scan) ──────────────────────────────────
async function callClaude(prompt, systemPrompt, imageBase64, imageType = "image/jpeg", userId) {
  if (!userId) throw new Error("Not authenticated");

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, systemPrompt, imageBase64, imageType, userId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Scan failed");
  }

  const data = await res.json();
  return data.result;
}

function getScanErrorMessage(error) {
  const msg = error?.message || "";
  if (msg.includes("Free plan") || msg.includes("Scan limit reached")) return msg;
  if (msg.includes("429")) return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("401")) return "API configuration error. Please contact support.";
  if (msg.includes("JSON")) return "Could not read document clearly. Try a sharper photo with better lighting.";
  return "Scan failed. Try a clearer photo or use manual entry.";
}

// ─── LOCAL STORAGE HELPERS ───────────────────────────────────────────────────
const LS = {
  get: (k, def) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch { return def; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};

function useStore(key, init) {
  const [state, setState] = useState(() => LS.get(key, typeof init === "function" ? init() : init));
  const set = useCallback(v => {
    setState(prev => {
      const next = typeof v === "function" ? v(prev) : v;
      LS.set(key, next);
      return next;
    });
  }, [key]);
  return [state, set];
}

// ─── UTILITY ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n, dec = 2) => (typeof n === "number" ? n : parseFloat(n) || 0).toLocaleString("pt-PT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtEur = n => `€${fmt(n)}`;
const today = () => new Date().toISOString().split("T")[0];

function getTierBadgeStyle(tier) {
  const tiers = {
    trial: {
      background: "linear-gradient(135deg, #1a2d44, #0f1a2e)",
      color: "#3B9EFF",
      border: "1px solid #3B9EFF55",
      icon: "✨",
      label: "Free Trial",
    },
    free: {
      background: "linear-gradient(135deg, #2A2A36, #1E1E28)",
      color: "#8A8A9A",
      border: "1px solid #3A3A48",
      icon: "🔓",
      label: "Free",
    },
    starter: {
      background: "linear-gradient(135deg, #1a2744, #0f1a33)",
      color: "#3B9EFF",
      border: "1px solid #3B9EFF55",
      icon: "⚡",
      label: "Starter",
    },
    growth: {
      background: "linear-gradient(135deg, #2d1f5e, #1a1040)",
      color: "#7C5CFC",
      border: "1px solid #7C5CFC77",
      icon: "🚀",
      label: "Growth",
    },
    pro: {
      background: "linear-gradient(135deg, #2d1f0f, #1a1200)",
      color: "#F5A623",
      border: "1px solid #F5A62366",
      icon: "👑",
      label: "Pro",
    },
  };
  return tiers[tier] || tiers.free;
}

function SubscriptionTierBadge({ subscription, onUpgrade }) {
  const { t } = useTranslation();
  const { isFree, plan } = useSubscriptionGate(subscription);
  const tierStyle = getTierBadgeStyle(subscription?.tier || "free");
  const scansUsed = subscription?.scans_used_this_month || 0;
  const scansTotal = subscription?.scan_limit ?? plan.scanLimit ?? 0;
  const scanPct = scansTotal ? Math.min((scansUsed / scansTotal) * 100, 100) : 0;
  const scansDisplay = formatScanLimit(scansTotal);

  return (
    <div
      style={{
        background: tierStyle.background,
        border: tierStyle.border,
        borderRadius: 10,
        padding: "8px 10px",
        marginTop: 8,
        cursor: isFree && onUpgrade ? "pointer" : "default",
      }}
      onClick={isFree && onUpgrade ? onUpgrade : undefined}
      role={isFree && onUpgrade ? "button" : undefined}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isFree ? 0 : 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: tierStyle.color, letterSpacing: ".3px" }}>
          <span>{tierStyle.icon}</span>
          <span>{tierStyle.label}</span>
        </div>
        {isFree && (
          <span style={{ fontSize: 10, color: C.accent, fontWeight: 600, letterSpacing: ".3px" }}>{t("common.upgrade")}</span>
        )}
      </div>
      {isFree ? (
        <div style={{ fontSize: 10, color: tierStyle.color, opacity: 0.75, marginTop: 4 }}>
          AI scans require a paid plan
        </div>
      ) : (
        <>
          <div style={{ fontSize: 10, color: tierStyle.color, opacity: 0.8, marginBottom: 4 }}>
            {scansUsed}/{scansDisplay} {t("common.scanLimit")}
          </div>
          <div style={{ height: 3, background: "#ffffff11", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: 99, background: tierStyle.color, width: `${scansTotal === 999999 ? 15 : scanPct}%`, transition: "width 0.3s ease" }} />
          </div>
        </>
      )}
    </div>
  );
}

function SidebarUpgradeButton({ onClick, embedded = false }) {
  const { t } = useTranslation();
  return (
    <div
      onClick={onClick}
      style={{
        margin: embedded ? 0 : "8px 8px 4px",
        padding: "11px 14px",
        borderRadius: 10,
        background: "linear-gradient(135deg, #7C5CFC, #5B2FD4)",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 4px 16px rgba(124, 92, 252, 0.35)",
        transition: "all 0.2s ease",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 6px 24px rgba(124,92,252,0.5)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(124,92,252,0.35)"; }}
    >
      <div style={{
        position: "absolute",
        top: 0,
        left: "-100%",
        width: "60%",
        height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
        animation: "shimmer 2.5s infinite",
      }} />
      <span style={{ fontSize: 16, position: "relative", zIndex: 1 }}>⚡</span>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", letterSpacing: ".2px" }}>{t("nav.upgrade")}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>{t("common.freeTrial")}</div>
      </div>
    </div>
  );
}
const monthLabel = d => { const [y, m] = d.split("-"); return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m-1]} ${y}`; };

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Spinner({ size = 20 }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.7s linear infinite", display: "inline-block" }} />
  );
}

function Badge({ color = C.accent, children }) {
  const { pick } = useTypeScale();
  return <span style={{ background: color + "22", color, padding: "2px 8px", borderRadius: 99, fontSize: pick(11, 12), fontWeight: 600, letterSpacing: ".4px" }}>{children}</span>;
}

function Btn({ onClick, disabled, loading, variant = "primary", size = "md", children, style = {}, title }) {
  const { pick } = useTypeScale();
  const base = { display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, fontWeight: 600, cursor: disabled || loading ? "not-allowed" : "pointer", border: "none", transition: "all .15s", opacity: disabled || loading ? 0.5 : 1 };
  const sizes = {
    sm: { padding: pick(6, 8) + "px " + pick(14, 16) + "px", fontSize: pick(12, 13) },
    md: { padding: pick(10, 12) + "px " + pick(20, 22) + "px", fontSize: pick(13, 14) },
    lg: { padding: pick(13, 15) + "px " + pick(28, 30) + "px", fontSize: pick(14, 15) },
  };
  const variants = {
    primary: { background: C.accent, color: "#fff" },
    ghost: { background: "transparent", color: C.textSub, border: `1px solid ${C.border}` },
    danger: { background: C.redDim, color: C.red, border: `1px solid ${C.red}44` },
    green: { background: C.greenDim, color: C.green, border: `1px solid ${C.green}44` },
  };
  return (
    <button title={title} onClick={!disabled && !loading ? onClick : undefined}
      className="apex-btn"
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {loading ? <Spinner size={14} /> : null}{children}
    </button>
  );
}

function Toast({ message }) {
  const isSm = useWindowWidth() < 768;
  if (!message) return null;
  return (
    <div style={{
      position: "fixed", zIndex: 3000, background: C.green, color: "#fff",
      padding: "12px 20px", borderRadius: isSm ? 10 : 12, fontWeight: 600, fontSize: 13,
      boxShadow: "0 4px 24px #0008", display: "flex", alignItems: "center", gap: 8, pointerEvents: "none",
      animation: isSm ? "toastInMobile 0.35s cubic-bezier(0.22, 1, 0.36, 1)" : "toastIn 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
      ...(isSm ? { top: 16, left: 16, right: 16 } : { bottom: 28, right: 28, maxWidth: 320 }),
    }}>
      ✓ {message}
    </div>
  );
}

function AllVenuesBanner({ venue }) {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(false);
  const isSm = useWindowWidth() < 768;
  if (venue || dismissed) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 10, padding: isSm ? "8px 12px" : "10px 16px", marginBottom: isSm ? 14 : 20, gap: 8 }}>
      <span style={{ fontSize: isSm ? 11 : 13, color: C.amber }}>
        👁 {isSm ? t("common.selectVenue") : t("common.viewingAll")}
      </span>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, padding: "2px 4px" }}>✕</button>
    </div>
  );
}

function VenueFormFields({ venues, value, onChange, messageKey }) {
  const { t } = useTranslation();
  if (!venues?.length) return null;
  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <Select
          label={t("common.venue")}
          value={value}
          onChange={onChange}
          options={[
            { value: "", label: t("common.chooseVenue") },
            ...venues.map(v => ({ value: v.id, label: `${v.isLocked ? "🔒 " : ""}${v.name}` })),
          ]}
        />
      </div>
      {!value && (
        <div style={{ background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 9, padding: "10px 14px", marginBottom: 14, fontSize: 13, color: C.amber, display: "flex", gap: 8, alignItems: "center" }}>
          <span>⚠</span>
          <span>{t(messageKey)}</span>
        </div>
      )}
    </>
  );
}

function Card({ children, style = {}, onClick }) {
  const { pick } = useTypeScale();
  return (
    <div onClick={onClick}
      className="apex-card"
      style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: pick(20, 22), ...style, cursor: onClick ? "pointer" : undefined }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = C.accent; }}
      onMouseLeave={e => { if (onClick) e.currentTarget.style.borderColor = C.border; }}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, prefix, style = {}, disabled }) {
  const { pick } = useTypeScale();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: pick(12, 13), color: C.textSub, fontWeight: 500 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "0 10px", color: C.textSub, fontSize: pick(13, 14) }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          disabled={disabled}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: pick(14, 15), padding: "10px 12px", fontFamily: "inherit", ...style }} />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, style = {} }) {
  const { pick } = useTypeScale();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: pick(12, 13), color: C.textSub, fontWeight: 500 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: pick(14, 15), padding: "10px 12px", outline: "none", fontFamily: "inherit", ...style }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 540 }) {
  const isSm = useWindowWidth() < 768;
  if (!open) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000b", display: "flex", alignItems: isSm ? "flex-end" : "center", justifyContent: "center", zIndex: 1000, padding: isSm ? 0 : 16, animation: "backdropIn 0.15s ease" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: C.surface,
        border: isSm ? "none" : `1px solid ${C.border}`,
        borderRadius: isSm ? "20px 20px 0 0" : 16,
        padding: isSm ? "0 16px 32px" : 28,
        paddingTop: isSm ? 0 : 28,
        width: "100%",
        maxWidth: isSm ? "100%" : width,
        maxHeight: isSm ? "92vh" : "90vh",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        willChange: "transform",
        animation: isSm ? "slideUp .3s cubic-bezier(0.4,0,0.2,1)" : "modalIn 0.22s cubic-bezier(0.22, 1, 0.36, 1)",
      }}>
        {isSm && (
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
            <div style={{ width: 40, height: 4, background: C.border, borderRadius: 2 }} />
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, paddingTop: isSm ? 8 : 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 6px" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = C.accent, icon, isWide }) {
  const { pick } = useTypeScale();
  return (
    <Card style={{ padding: pick(16, 18), minWidth: 0, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: pick(11, 13), color: C.textSub, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
          <div style={{ fontSize: pick(20, 27), fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
          {sub && <div style={{ fontSize: pick(11, 12), color: color, marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: pick(18, 20), opacity: .7, flexShrink: 0, marginLeft: 6 }}>{icon}</div>}
      </div>
    </Card>
  );
}

function MiniBar({ data, color = C.accent, height = 60 }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} title={`${d.label}: ${fmtEur(d.value)}`} style={{ flex: 1, background: color + "44", borderRadius: "3px 3px 0 0", height: `${(d.value / max) * 100}%`, minHeight: 3, cursor: "default", transition: "background .15s" }}
          onMouseEnter={e => e.currentTarget.style.background = color + "88"}
          onMouseLeave={e => e.currentTarget.style.background = color + "44"} />
      ))}
    </div>
  );
}

function computeInvoiceReviewTotals(extracted, editItems) {
  const subtotal = editItems.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const tax = extracted?.taxRate != null && extracted.taxRate !== ""
    ? subtotal * (parseFloat(extracted.taxRate) / 100)
    : (parseFloat(extracted?.tax) || 0);
  return { subtotal, tax, total: subtotal + tax };
}

const inlineCellInputStyle = {
  width: "100%",
  background: C.surfaceL,
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  color: C.text,
  fontSize: 12,
  padding: "4px 8px",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const INVOICE_SCAN_PROMPT = `You are analyzing a supplier invoice image for a small business management system. Extract ALL visible data precisely.

Return ONLY a valid JSON object with exactly this structure (use null for any field not visible):
{
  "supplierName": "string",
  "supplierNIF": "string or null",
  "supplierIBAN": "string or null",
  "supplierAddress": "string or null",
  "supplierPhone": "string or null",
  "date": "YYYY-MM-DD or null",
  "invoiceNumber": "string or null",
  "dueDate": "YYYY-MM-DD or null",
  "items": [
    {
      "name": "string",
      "qty": number,
      "unit": "string (kg/L/un/g/etc)",
      "unitPrice": number,
      "total": number
    }
  ],
  "subtotal": number,
  "taxRate": number,
  "tax": number,
  "total": number,
  "currency": "EUR"
}

Rules:
- All monetary values as numbers without currency symbols
- Dates in YYYY-MM-DD format only
- If items are not itemized, return an empty array []
- taxRate as percentage (e.g. 23 for 23% VAT)
- Return ONLY the JSON object, no explanation, no markdown`;

const INVOICE_SCAN_SYSTEM_PROMPT = "You are a precise OCR and data extraction engine specialized in Portuguese and Spanish supplier invoices. Extract data exactly as shown. Return only valid JSON.";

async function extractInvoiceFromImage(file, userId) {
  const b64 = await fileToBase64(file);
  const raw = await callClaude(INVOICE_SCAN_PROMPT, INVOICE_SCAN_SYSTEM_PROMPT, b64, file.type, userId);
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function InvoiceScanReviewPanel({
  t, isMobile, venues, formVenueId, onVenueChange,
  extracted, editItems, onExtractedChange, onLineItemChange,
  footer, hideVenue = false, hideDisclaimer = false,
}) {
  const { subtotal, tax, total } = computeInvoiceReviewTotals(extracted, editItems);
  return (
    <div>
      {!hideVenue && (
        <VenueFormFields venues={venues} value={formVenueId} onChange={onVenueChange} messageKey="invoices.selectVenueToSave" />
      )}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
        <Input label={t("invoices.supplier")} value={extracted.supplierName || ""} onChange={v => onExtractedChange(p => ({ ...p, supplierName: v }))} />
        <Input label={t("invoices.nif")} value={extracted.supplierNIF || ""} onChange={v => onExtractedChange(p => ({ ...p, supplierNIF: v }))} placeholder="PT123456789" />
        <Input label={t("invoices.iban")} value={extracted.supplierIBAN || ""} onChange={v => onExtractedChange(p => ({ ...p, supplierIBAN: v }))} placeholder="PT50 0000…" />
        <DateInput label={t("invoices.date")} value={extracted.date || ""} onChange={v => onExtractedChange(p => ({ ...p, date: v }))} />
        <Input label={t("invoices.invoiceNumber")} value={extracted.invoiceNumber || ""} onChange={v => onExtractedChange(p => ({ ...p, invoiceNumber: v }))} placeholder="INV-001" />
        <DateInput label={t("invoices.dueDate")} value={extracted.dueDate || ""} onChange={v => onExtractedChange(p => ({ ...p, dueDate: v }))} />
      </div>
      {!hideDisclaimer && <AiExtractionNotice variant="invoice" />}
      <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 8 }}>{t("invoices.lineItems")}</div>
      <div className="scroll-x" style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 480 }}>
          <thead>
            <tr style={{ background: C.surfaceL }}>
              {[t("invoices.item"), t("invoices.qty"), t("invoices.unit"), t("invoices.unitPrice"), t("invoices.total")].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 500, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {editItems.map((item, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "6px 8px" }}>
                  <input type="text" value={item.name || ""} onChange={e => onLineItemChange(i, "name", e.target.value)} style={inlineCellInputStyle} />
                </td>
                <td style={{ padding: "6px 8px", width: 72 }}>
                  <input type="number" value={item.qty ?? ""} onChange={e => onLineItemChange(i, "qty", e.target.value)} style={inlineCellInputStyle} />
                </td>
                <td style={{ padding: "6px 8px", width: 72 }}>
                  <input type="text" value={item.unit || ""} onChange={e => onLineItemChange(i, "unit", e.target.value)} style={inlineCellInputStyle} />
                </td>
                <td style={{ padding: "6px 8px", width: 96 }}>
                  <input type="number" step="0.01" value={item.unitPrice ?? ""} onChange={e => onLineItemChange(i, "unitPrice", e.target.value)} style={inlineCellInputStyle} />
                </td>
                <td style={{ padding: "6px 8px", width: 96 }}>
                  <input type="number" step="0.01" value={item.total ?? ""} onChange={e => onLineItemChange(i, "total", e.target.value)} style={{ ...inlineCellInputStyle, fontWeight: 600 }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 12, fontSize: 14, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ color: C.textSub }}>{t("invoices.net")}: {fmtEur(subtotal)}</span>
        {extracted?.taxRate != null && extracted.taxRate !== "" ? (
          <span style={{ color: C.textSub }}>{t("invoices.tax")} ({extracted.taxRate}%): {fmtEur(tax)}</span>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: C.textSub, fontSize: 13 }}>{t("invoices.tax")}:</span>
            <input
              type="number"
              step="0.01"
              value={extracted?.tax ?? ""}
              onChange={e => onExtractedChange(p => ({ ...p, tax: e.target.value === "" ? "" : parseFloat(e.target.value) || 0 }))}
              style={{ ...inlineCellInputStyle, width: 88 }}
            />
          </div>
        )}
        <span style={{ color: C.text, fontWeight: 700 }}>{t("invoices.total")}: {fmtEur(total)}</span>
      </div>
      {footer}
    </div>
  );
}

function queueStatusIcon(status) {
  if (status === "pending") return "⏳";
  if (status === "scanning") return "🔄";
  if (status === "done") return "✓";
  if (status === "error") return "⚠";
  if (status === "skipped") return "—";
  return "•";
}

function ScanFirstTimeTip() {
  const { t } = useTranslation();
  const [showScanTip, setShowScanTip] = useState(
    () => !localStorage.getItem("apex_scan_tip_seen")
  );

  const dismissScanTip = () => {
    localStorage.setItem("apex_scan_tip_seen", "true");
    setShowScanTip(false);
  };

  if (!showScanTip) return null;

  return (
    <div style={{
      background: "#7C5CFC11",
      border: "1px solid #7C5CFC33",
      borderRadius: 9,
      padding: "12px 14px",
      marginBottom: 14,
      fontSize: 12.5,
      color: C.textSub,
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>💡</span>
      <div style={{ flex: 1 }}>
        <strong style={{ color: C.text }}>{t("aiScan.tipTitle")}</strong>{" "}
        {t("aiScan.tipBody")}
      </div>
      <button type="button" onClick={dismissScanTip} style={{
        background: "none", border: "none", color: C.textMuted,
        cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0,
      }}>✕</button>
    </div>
  );
}

function AiExtractionNotice({ variant }) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: "flex",
      alignItems: "flex-start",
      gap: 10,
      background: "#F5A62311",
      border: "1px solid #F5A62333",
      borderRadius: 9,
      padding: "11px 14px",
      marginBottom: 16,
      fontSize: 12.5,
      color: C.textSub,
      lineHeight: 1.5,
    }}>
      <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>⚠️</span>
      <span>
        {variant === "batch" ? (
          t("aiScan.batchDisclaimer")
        ) : (
          <>
            <strong style={{ color: C.text }}>{t("aiScan.disclaimerTitle")}</strong>{" "}
            {variant === "invoice" ? t("aiScan.invoiceDisclaimer") : t("aiScan.salesDisclaimer")}
          </>
        )}
      </span>
    </div>
  );
}

function UploadZone({ onFile, accept = "image/*", label = "Drop image or click to upload", loading }) {
  const { t } = useTranslation();
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handle = f => { if (f && f[0]) onFile(f[0]); };
  return (
    <div
      onClick={() => !loading && ref.current.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
      style={{ border: `2px dashed ${drag ? C.accent : C.border}`, borderRadius: 14, padding: "32px 24px", textAlign: "center", cursor: loading ? "not-allowed" : "pointer", background: drag ? C.accentDim : C.surfaceL, transition: "all .15s" }}>
      <input ref={ref} type="file" accept={accept} style={{ display: "none" }} onChange={e => handle(e.target.files)} />
      {loading ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><Spinner size={28} /><span style={{ color: C.textSub, fontSize: 13 }}>{t("common.analysing")}</span></div>
        : <div style={{ color: C.textSub, fontSize: 14 }}>📎 {label}</div>}
    </div>
  );
}

function EmptyState({ icon, title, sub, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 24px", gap: 12, textAlign: "center" }}>
      <div style={{ fontSize: 42, opacity: .5 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{title}</div>
      {sub && <div style={{ fontSize: 13, color: C.textSub, maxWidth: 280 }}>{sub}</div>}
      {action}
    </div>
  );
}

// ─── COOKIE CONSENT ──────────────────────────────────────────────────────────
function readCookieConsent() {
  try {
    const raw = localStorage.getItem("cookie_consent");
    if (!raw) return null;
    if (raw === "accepted") return { essential: true, analytics: true };
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function ToggleSwitch({ checked, onChange, ariaLabel }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 99,
        border: "none",
        cursor: "pointer",
        background: checked ? C.accent : C.surfaceL,
        position: "relative",
        transition: "background .15s",
        flexShrink: 0,
        boxShadow: `inset 0 0 0 1px ${checked ? C.accent : C.border}`,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        left: checked ? 23 : 3,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: "#fff",
        transition: "left .15s",
      }} />
    </button>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(() => !readCookieConsent());

  const setConsent = (analyticsAllowed) => {
    const consent = {
      essential: true,
      analytics: analyticsAllowed,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem("cookie_consent", JSON.stringify(consent));
    setVisible(false);
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: consent }));
  };

  const acceptAll = () => setConsent(true);
  const rejectAnalytics = () => setConsent(false);

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      padding: "16px 24px",
      boxShadow: "0 -4px 24px #00000044",
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        gap: 20, flexWrap: "wrap", fontSize: 13, color: C.textSub,
        maxWidth: 1000, margin: "0 auto",
      }}>
        <span style={{ flex: "1 1 320px" }}>
          🍪 We use essential cookies to keep you signed in, and — only
          with your permission — analytics cookies to understand how
          the app is used and improve it.
        </span>
        <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center", flexWrap: "wrap" }}>
          <Link to="/cookies" style={{ fontSize: 13, color: C.accent, textDecoration: "none", fontWeight: 600 }}>
            Cookie Policy
          </Link>
          <button
            onClick={rejectAnalytics}
            style={{
              background: "transparent", color: C.textSub,
              border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "8px 16px", fontWeight: 600,
              fontSize: 13, cursor: "pointer",
            }}
          >
            Reject Analytics
          </button>
          <button
            onClick={acceptAll}
            style={{
              background: C.accent, color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 20px", fontWeight: 700,
              fontSize: 13, cursor: "pointer",
            }}
          >
            Accept All
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ defaultMode = "login" }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const switchMode = (m) => { setMode(m); setError(""); setTermsAgreed(false); };

  const login = async () => {
    if (!email || !password) return;
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const register = async () => {
    if (!name || !email || !password) return setError(t("auth.fillFields"));
    if (!termsAgreed) return setError(t("auth.termsRequired"));
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, agreed_to_terms_at: new Date().toISOString() } },
    });
    if (error) setError(error.message);
    else trackEvent("sign_up", { method: "email" });
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key !== "Enter" || loading) return;
    if (mode === "login") {
      login();
    } else {
      register();
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <Logo size={40} />
          </div>
          <p style={{ color: C.textSub, margin: 0, fontSize: 14 }}>{t("auth.tagline")}</p>
        </div>
        <Card>
          <div style={{ display: "flex", marginBottom: 24, gap: 8 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: mode === m ? C.accent : C.surfaceL, color: mode === m ? "#fff" : C.textSub, transition: "all .15s" }}>
                {m === "login" ? t("auth.signIn") : t("auth.signUp")}
              </button>
            ))}
          </div>
          {/* onKeyDown on the container catches Enter from any input inside */}
          <div onKeyDown={handleKeyDown} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <Input label={t("auth.fullName")} value={name} onChange={setName} placeholder="João Silva" />}
            <Input label={t("auth.email")} value={email} onChange={setEmail} type="email" placeholder="you@yourbusiness.com" />
            <Input label={t("auth.password")} value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          </div>
          {mode === "register" && (
            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginTop: 16, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={termsAgreed}
                onChange={e => setTermsAgreed(e.target.checked)}
                style={{ marginTop: 2, accentColor: C.accent, width: 16, height: 16, flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: C.textSub, lineHeight: 1.6 }}>
                {t("auth.agreeTermsPrefix")}{" "}
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.accent }}>{t("auth.termsOfService")}</a>
                {" "}{t("auth.and")}{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: C.accent }}>{t("auth.privacyPolicy")}</a>
              </span>
            </label>
          )}
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>⚠ {error}</div>}
          <Btn
            onClick={mode === "login" ? login : register}
            loading={loading}
            disabled={mode === "register" && !termsAgreed}
            title={mode === "register" && !termsAgreed ? t("auth.termsRequired") : undefined}
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
            size="lg"
          >
            {mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── MOBILE HEADER ───────────────────────────────────────────────────────────
function MobileHeader({ page, onOpenDrawer, venue, venues, onVenueChange }) {
  const { t } = useTranslation();
  const PAGE_NAMES = {
    dashboard: "nav.dashboard",
    sales: "nav.dailySales",
    invoices: "nav.invoices",
    expenses: "nav.expenses",
    suppliers: "nav.suppliers",
    stock: "nav.stock",
    staff: "nav.staff",
    analytics: "nav.analytics",
    settings: "nav.settings",
    pricing: "nav.upgrade",
  };
  const pageTitle = PAGE_NAMES[page] ? t(PAGE_NAMES[page]) : "ApexManager";
  const showVenueChip = venues?.length > 0 && onVenueChange && page !== "settings" && page !== "pricing";
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#16161E", borderBottom: `1px solid ${C.border}`, zIndex: 200, display: "flex", alignItems: "center", paddingTop: "env(safe-area-inset-top)" }}>
      <button onClick={onOpenDrawer} style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: C.text, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>☰</button>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minWidth: 0, padding: "0 4px" }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 1 }}>{pageTitle}</span>
        {showVenueChip && <VenueChip venue={venue} venues={venues} onVenueChange={onVenueChange} compact />}
      </div>
      <div style={{ width: 56, flexShrink: 0 }} />
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
function BottomNav({ page, setPage, onOpenDrawer }) {
  const { t } = useTranslation();
  const bottomNavItems = [
    { id: "dashboard", icon: "📊", label: t("nav.dashboard") },
    { id: "sales",     icon: "💳", label: t("nav.sales") },
    { id: "invoices",  icon: "🧾", label: t("nav.invoices") },
    { id: "expenses",  icon: "💸", label: t("nav.expenses") },
    { id: "more",      icon: "⋯",  label: t("nav.more") },
  ];
  const MORE_PAGES = ["analytics", "suppliers", "stock", "staff", "settings", "pricing"];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#16161E", borderTop: `1px solid ${C.border}`, zIndex: 200, display: "flex", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {bottomNavItems.map(n => {
        const isActive = n.id === "more" ? MORE_PAGES.includes(page) : page === n.id;
        const color = isActive ? C.accent : "#55556A";
        return (
          <button key={n.id} onClick={() => n.id === "more" ? onOpenDrawer() : setPage(n.id)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color, height: 60, padding: "8px 0", minHeight: 44 }}>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{n.icon}</span>
            <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: 0.2 }}>{n.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── NAV DRAWER (mobile) ─────────────────────────────────────────────────────
function NavDrawer({ open, onClose, page, setPage, venue, venues, onVenueChange, user, onLogout, subscription }) {
  const { t } = useTranslation();
  const mainNavItems = [
    { id: "dashboard", icon: "📊", label: t("nav.dashboard") },
    { id: "sales",       icon: "💳", label: t("nav.dailySales") },
    { id: "invoices",    icon: "🧾", label: t("nav.invoices") },
    { id: "expenses",    icon: "💸", label: t("nav.expenses") },
    { id: "analytics",   icon: "📈", label: t("nav.analytics") },
  ];
  const dbItems = [
    { id: "suppliers",   icon: "🏭", label: t("nav.suppliers") },
    { id: "stock", icon: "📦", label: t("nav.stock") },
    { id: "staff",       icon: "👥", label: t("nav.staff") },
  ];
  const dbActive = ["suppliers","stock","staff"].includes(page);
  const [dbOpen, setDbOpen] = useState(dbActive);
  const go = id => { setPage(id); onClose(); };
  const DRAWER_W = Math.min(280, window.innerWidth * 0.85);
  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 500, opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none", transition: "opacity 0.28s cubic-bezier(0.4,0,0.2,1)" }} />
      {/* Drawer panel */}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: DRAWER_W, background: C.surface, borderRight: `1px solid ${C.border}`, zIndex: 501, display: "flex", flexDirection: "column", willChange: "transform", transform: open ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)", paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div style={{ padding: "16px 14px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <Logo size={24} />
            <div style={{ fontSize: 11, color: C.textSub, marginTop: 5 }}>{user?.user_metadata?.name}</div>
            {subscription && (
              <SubscriptionTierBadge subscription={subscription} onUpgrade={() => go("pricing")} />
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 6px", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {venues.length > 0 && (
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 }}>{t("common.venue")}</div>
            <select value={venue?.id || ""} onChange={e => { onVenueChange(e.target.value); onClose(); }}
              style={{ width: "100%", background: C.surfaceL, border: `1px solid ${!venue ? C.amber + "88" : C.border}`, borderRadius: 8, color: !venue ? C.amber : C.text, fontSize: 15, padding: "10px 10px", outline: "none", fontFamily: "inherit", minHeight: 48 }}>
              <option value="">{t("common.allVenues")}</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.isLocked ? "🔒 " : ""}{v.name}</option>)}
            </select>
          </div>
        )}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 1 }}>
          {mainNavItems.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px", height: 48, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: active ? C.accentDim : "transparent", color: active ? C.accent : C.textSub, fontWeight: active ? 600 : 400, fontSize: 14, width: "100%" }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
          {/* Data Base group */}
          <button onClick={() => setDbOpen(o => !o)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px", height: 48, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: dbActive ? C.accentDim : "transparent", color: dbActive ? C.accent : C.textSub, fontWeight: dbActive ? 600 : 400, fontSize: 14, width: "100%" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>🗄️</span>
            <span style={{ flex: 1 }}>{t("nav.dataBase")}</span>
            <span style={{ fontSize: 11, transition: "transform .2s", display: "inline-block", transform: dbOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
          </button>
          {dbOpen && dbItems.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px 0 30px", height: 44, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: active ? C.accentDim : "transparent", color: active ? C.accent : C.textSub, fontWeight: active ? 600 : 400, fontSize: 13, width: "100%" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
          <button onClick={() => go("settings")}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 14px", height: 48, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", background: page === "settings" ? C.accentDim : "transparent", color: page === "settings" ? C.accent : C.textSub, fontWeight: page === "settings" ? 600 : 400, fontSize: 14, width: "100%" }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚙️</span>{t("nav.settings")}
          </button>
        </nav>
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          {(subscription?.tier ?? "free") === "free" && (
            <SidebarUpgradeButton onClick={() => go("pricing")} />
          )}
          <div style={{ padding: "8px 14px 14px" }}>
            <button onClick={() => { onLogout(); onClose(); }} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, minHeight: 44 }}>🚪 {t("nav.signOut")}</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, venue, venues, onVenueChange, user, onLogout, subscription }) {
  const { t } = useTranslation();
  const { pick } = useTypeScale();
  const mainNavItems = [
    { id: "dashboard", icon: "📊", label: t("nav.dashboard") },
    { id: "sales", icon: "💳", label: t("nav.dailySales") },
    { id: "invoices", icon: "🧾", label: t("nav.invoices") },
    { id: "expenses", icon: "💸", label: t("nav.expenses") },
    { id: "analytics", icon: "📈", label: t("nav.analytics") },
  ];
  const dbItems = [
    { id: "suppliers",   icon: "🏭", label: t("nav.suppliers") },
    { id: "stock", icon: "📦", label: t("nav.stock") },
    { id: "staff",       icon: "👥", label: t("nav.staff") },
  ];
  const [dbOpen, setDbOpen] = useState(["suppliers", "stock", "staff"].includes(page));

  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const dbActive = ["suppliers","stock","staff"].includes(page);
  return (
    <div style={{ width: 220, minWidth: 220, maxWidth: 220, flexShrink: 0, overflowX: "hidden", overflowY: "auto", height: "100vh", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <Logo size={27.5} />
        <div style={{ fontSize: 10, color: C.textSub, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.user_metadata?.name}</div>
        {subscription && (
          <SubscriptionTierBadge subscription={subscription} onUpgrade={() => setPage("pricing")} />
        )}
      </div>
      {venues.length > 0 && (
        <div style={{ padding: "7px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: C.textMuted }}>{t("common.venue")}</span>
            {!venue && <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber, display: "inline-block", flexShrink: 0 }} />}
          </div>
          <select value={venue?.id || ""} onChange={e => onVenueChange(e.target.value)}
            style={{ width: "100%", background: C.surfaceL, border: `1px solid ${!venue ? C.amber + "88" : C.border}`, borderRadius: 6, color: !venue ? C.amber : C.text, fontSize: pick(11, 14), padding: "5px 8px", outline: "none", fontFamily: "inherit" }}>
            <option value="">{t("common.allVenues")}</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.isLocked ? "🔒 " : ""}{v.name}</option>)}
          </select>
          {!venue && <div style={{ fontSize: 9, color: C.amber, marginTop: 3 }}>{t("common.selectVenue")}</div>}
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>{todayStr}</div>
        </div>
      )}
      <nav style={{ flex: 1, padding: "6px 5px", display: "flex", flexDirection: "column", gap: 1 }}>
        {mainNavItems.map(n => {
          const active = page === n.id;
          return (
            <button key={n.id} onClick={() => setPage(n.id)}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.surfaceL; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: `${pick(7, 10)}px ${pick(10, 13)}px ${pick(7, 10)}px ${pick(8, 10)}px`, borderRadius: 7, cursor: "pointer", textAlign: "left",
                border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                background: active ? C.accentDim : "transparent",
                color: active ? C.accent : C.textSub,
                fontWeight: active ? 600 : 400, fontSize: pick(12.5, 14),
                transition: "background .12s, color .12s", whiteSpace: "nowrap", overflow: "hidden",
              }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>{n.icon}</span>
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{n.label}</span>
            </button>
          );
        })}

        {/* Collapsible Data Base group */}
        <div style={{ marginTop: 1 }}>
          <button onClick={() => setDbOpen(o => !o)}
            onMouseEnter={e => { if (!dbActive) e.currentTarget.style.background = C.surfaceL; }}
            onMouseLeave={e => { if (!dbActive) e.currentTarget.style.background = "transparent"; }}
            style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              padding: `${pick(7, 10)}px ${pick(10, 13)}px ${pick(7, 10)}px ${pick(8, 10)}px`, borderRadius: 7, cursor: "pointer", textAlign: "left",
              border: "none", borderLeft: dbActive ? `3px solid ${C.accent}` : "3px solid transparent",
              background: dbActive ? C.accentDim : "transparent",
              color: dbActive ? C.accent : C.textSub,
              fontWeight: dbActive ? 600 : 400, fontSize: pick(12.5, 14),
              transition: "background .12s, color .12s",
            }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🗄️</span>
            <span style={{ flex: 1, textAlign: "left" }}>{t("nav.dataBase")}</span>
            <span style={{ fontSize: 9, transition: "transform .2s", display: "inline-block", transform: dbOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
          </button>
          {dbOpen && dbItems.map(n => {
            const active = page === n.id;
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.surfaceL; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                style={{
                  display: "flex", alignItems: "center", gap: 8, width: "100%",
                  padding: `${pick(6, 9)}px ${pick(10, 13)}px ${pick(6, 9)}px ${pick(18, 20)}px`, borderRadius: 7, cursor: "pointer", textAlign: "left",
                  border: "none", borderLeft: active ? `3px solid ${C.accent}` : "3px solid transparent",
                  background: active ? C.accentDim : "transparent",
                  color: active ? C.accent : C.textSub,
                  fontWeight: active ? 600 : 400, fontSize: pick(12, 14),
                  transition: "background .12s, color .12s",
                }}>
                <span style={{ fontSize: 13, flexShrink: 0 }}>{n.icon}</span>{n.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => setPage("settings")}
          onMouseEnter={e => { if (page !== "settings") e.currentTarget.style.background = C.surfaceL; }}
          onMouseLeave={e => { if (page !== "settings") e.currentTarget.style.background = "transparent"; }}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%",
            padding: `${pick(7, 10)}px ${pick(10, 13)}px ${pick(7, 10)}px ${pick(8, 10)}px`, borderRadius: 7, cursor: "pointer", textAlign: "left",
            border: "none", borderLeft: page === "settings" ? `3px solid ${C.accent}` : "3px solid transparent",
            background: page === "settings" ? C.accentDim : "transparent",
            color: page === "settings" ? C.accent : C.textSub,
            fontWeight: page === "settings" ? 600 : 400, fontSize: pick(12.5, 14),
            transition: "background .12s, color .12s", whiteSpace: "nowrap", overflow: "hidden",
          }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>⚙️</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t("nav.settings")}</span>
        </button>
      </nav>
      {/* Bottom actions */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
        {(subscription?.tier ?? "free") === "free" && (
          <SidebarUpgradeButton onClick={() => setPage("pricing")} />
        )}
        <div style={{ padding: "6px 10px 10px" }}>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>🚪 {t("nav.signOut")}</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
function DashboardPage({ venues, sales, expenses, invoices, venue, subscription, setPage, setInvoicesInitialFilter, onVenueChange }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1024;
  const isWide = w >= 1280;
  const { pick } = useTypeScale();
  const { isFree } = useSubscriptionGate(subscription);
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [range, setRange] = useState(isFree ? "7days" : "month");
  const [upgradeBanner, setUpgradeBanner] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return false;
  });

  useEffect(() => {
    if (isFree && range !== "7days") setRange("7days");
  }, [isFree, range]);

  useEffect(() => {
    if (!upgradeBanner) return;
    const plan = PLANS[subscription?.tier];
    trackEvent("purchase", {
      currency: "EUR",
      value: plan?.monthlyPrice ?? plan?.price ?? 0,
    });
  }, [upgradeBanner, subscription?.tier]);

  const now = new Date();
  const filtered = sales.filter(s => {
    const d = new Date(s.date);
    if (range === "7days") return (now - d) / 86400000 <= 7;
    if (range === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    if (range === "year") return d.getFullYear() === now.getFullYear();
    return true;
  });

  const totalSales = filtered.reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
  const totalCash = filtered.reduce((a, s) => a + (s.cash || 0), 0);
  const totalCard = filtered.reduce((a, s) => a + (s.card || 0), 0);
  const totalDailyCosts = filtered.reduce((a, s) => a + (s.cash_expenses || 0), 0);
  const totalXpto = filtered.reduce((a, s) => a + (s.xpto || 0), 0);
  const totalFixedExp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const paidInvoices = invoices.filter(i => i.status === "paid").reduce((a, i) => a + (i.total || 0), 0);
  const pendingInvoices = invoices.filter(i => i.status !== "paid").reduce((a, i) => a + (i.total || 0), 0);
  const totalCosts = totalDailyCosts + totalFixedExp + paidInvoices;
  const profit = totalSales - totalCosts;
  const margin = totalSales ? (profit / totalSales) * 100 : 0;

  const uniqueDays = new Set(filtered.map(s => s.date)).size;
  const avgDailyRevenue = uniqueDays > 0 ? totalSales / uniqueDays : 0;
  const cashPct = totalSales ? ((totalCash / totalSales) * 100).toFixed(1) : "0";
  const cardPct = totalSales ? ((totalCard / totalSales) * 100).toFixed(1) : "0";

  const weekData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (7 * (7 - i)));
    const label = `W${8 - i}`;
    const value = sales.filter(s => { const sd = new Date(s.date); return (d - sd) / 86400000 <= 7 && (d - sd) >= 0; }).reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
    return { label, value };
  });
  const weekMax = Math.max(...weekData.map(d => d.value), 1);
  const weekAvg = weekData.reduce((a, d) => a + d.value, 0) / weekData.length;

  const revenueBarSegments = [
    { label: t("dashboard.dailyCosts"), value: totalDailyCosts, color: C.amber },
    { label: t("dashboard.fixedExpenses"), value: totalFixedExp, color: C.red },
    { label: t("dashboard.paidInvoices"), value: paidInvoices, color: C.blue },
    { label: t("dashboard.netProfit"), value: Math.max(0, profit), color: C.green },
  ];
  const revenueBarBase = totalSales || 1;

  const pendingList = invoices.filter(i => i.status !== "paid").sort((a, b) => (b.total || 0) - (a.total || 0));

  const pendingDueColor = (dueDate) => {
    if (!dueDate) return null;
    if (dueDate < today()) return C.red;
    const end = new Date();
    end.setDate(end.getDate() + 7);
    if (dueDate <= end.toISOString().slice(0, 10)) return C.amber;
    return C.textMuted;
  };

  const mNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlySnapshot = (range === "year" || range === "all") ? Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const mk = `${y}-${String(m + 1).padStart(2, "0")}`;
    const monthSales = sales.filter(s => {
      const sd = new Date(s.date);
      if (range === "year" && sd.getFullYear() !== now.getFullYear()) return false;
      return sd.getMonth() === m && sd.getFullYear() === y;
    });
    const rev = monthSales.reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
    const daily = monthSales.reduce((a, s) => a + (s.cash_expenses || 0), 0);
    const fixed = expenses.filter(e => e.date?.startsWith(mk)).reduce((a, e) => a + (e.amount || 0), 0);
    const paid = invoices.filter(i => i.status === "paid" && i.date?.startsWith(mk)).reduce((a, i) => a + (i.total || 0), 0);
    const costs = daily + fixed + paid;
    const net = rev - costs;
    return { label: `${mNames[m]} ${y}`, rev, costs, net, margin: rev ? (net / rev) * 100 : 0 };
  }) : [];

  const ranges = [{ v: "7days", l: t("dashboard.7days") }, { v: "month", l: t("dashboard.thisMonth") }, { v: "year", l: t("dashboard.thisYear") }, { v: "all", l: t("dashboard.allTime") }];
  const pad = pagePad(isMobile, isTablet);
  const chartH = isWide ? 120 : 90;
  const heroBig = pick(26, 32);
  const heroNet = pick(28, 36);

  const heroCol = (label, children, mobileTint) => (
    <div style={{
      flex: 1,
      minWidth: 0,
      textAlign: "center",
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      ...(isMobile
        ? { paddingTop: 16, paddingBottom: 16, paddingLeft: 12, paddingRight: 12, width: "100%", ...mobileTint }
        : { padding: "20px 16px" }),
    }}>
      <div style={{ fontSize: pick(11, 12), fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );

  const heroSep = (
    <div style={{ height: 1, background: C.border, margin: "16px 0", width: "100%" }} />
  );

  return (
    <div style={{ padding: pad, width: "100%", boxSizing: "border-box" }}>
      {upgradeBanner && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, fontSize: 13 }}>
          <span style={{ color: C.green, fontWeight: 600 }}>
            🎉 Welcome to <span style={{ textTransform: "capitalize" }}>{subscription?.tier}</span>! Your plan is now active.
          </span>
          <button onClick={() => setUpgradeBanner(false)} style={{ background: "none", border: "none", color: C.green, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 4px" }}>×</button>
        </div>
      )}
      <AllVenuesBanner venue={venue} />
      <TrialBanner subscription={subscription} onPricing={() => setPage("pricing")} />
      <LockedVenuesBanner venuesWithLockStatus={venues} onUpgrade={() => setPage("pricing")} />

      <div style={{ marginBottom: pick(18, 22) }}>
        {!isMobile && (
          <PageHeader
            title={t("dashboard.title")}
            venue={venue}
            venues={venues}
            onVenueChange={onVenueChange}
            isMobile={isMobile}
            isTablet={isTablet}
            isWide={isWide}
            titleOnly
            marginBottom={16}
          />
        )}
        <div className="scroll-x" style={{ display: "flex", gap: 6 }}>
          {ranges.map(r => (
            <button key={r.v} onClick={() => {
              if (isFree && r.v !== "7days") {
                setUpgradePrompt("range");
                return;
              }
              setRange(r.v);
            }}
              style={{ padding: `${pick(7, 8)}px ${pick(14, 16)}px`, borderRadius: 8, border: `1px solid ${range === r.v ? C.accent : C.border}`, background: range === r.v ? C.accentDim : "transparent", color: range === r.v ? C.accent : C.textSub, fontSize: pick(12, 13), cursor: "pointer", fontWeight: range === r.v ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
              {r.l}{isFree && r.v !== "7days" ? " 🔒" : ""}
            </button>
          ))}
        </div>
        {isFree && (
          <div style={{
            background: "#7C5CFC11",
            border: "1px solid #7C5CFC33",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            color: C.textSub,
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <span>🔒 {t("dashboard.freePlanBanner")}</span>
            <button type="button" onClick={() => setPage("pricing")} style={{
              background: "none", border: "none", color: C.accent,
              cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0,
            }}>{t("dashboard.upgradeUnlock")}</button>
          </div>
        )}
      </div>

      {/* SECTION 1 — Money In vs Money Out */}
      <Card style={{ padding: isMobile ? 16 : 22, marginBottom: pick(14, 18) }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "stretch" }}>
          {heroCol(t("dashboard.moneyIn"), <>
            <div style={{ fontSize: heroBig, fontWeight: 800, color: C.green, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(totalSales)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginTop: 8 }}>
              {t("sales.cash")} {fmtEur(totalCash)} · {t("sales.card")} {fmtEur(totalCard)}
            </div>
            <div style={{ fontSize: pick(11, 12), color: C.textMuted, marginTop: 4 }}>
              {t("dashboard.xpto")} {fmtEur(totalXpto)} <span style={{ fontStyle: "italic" }}>({t("dashboard.referenceOnly")})</span>
            </div>
          </>)}

          {isMobile ? heroSep : <div style={{ width: 1, background: C.border, margin: "8px 0" }} />}

          {heroCol(t("dashboard.netPosition"), <>
            <div style={{ fontSize: heroNet, fontWeight: 800, color: profit >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(profit)}</div>
            <div style={{ fontSize: pick(12, 13), color: profit >= 0 ? C.green : C.red, marginTop: 8, fontWeight: 600 }}>
              {totalSales ? `${margin.toFixed(1)}% ${t("dashboard.margin")}` : "—"}
            </div>
          </>, isMobile ? {
            background: profit >= 0 ? "rgba(34, 201, 122, 0.04)" : "rgba(240, 64, 96, 0.04)",
            borderRadius: 8,
            padding: 16,
          } : undefined)}

          {isMobile ? heroSep : <div style={{ width: 1, background: C.border, margin: "8px 0" }} />}

          {heroCol(t("dashboard.moneyOut"), <>
            <div style={{ fontSize: heroBig, fontWeight: 800, color: C.red, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(totalCosts)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginTop: 8 }}>
              Daily {fmtEur(totalDailyCosts)} · Fixed {fmtEur(totalFixedExp)} · Paid inv. {fmtEur(paidInvoices)}
            </div>
          </>, isMobile ? {
            background: "rgba(240, 64, 96, 0.04)",
            borderRadius: 8,
            padding: 16,
          } : undefined)}
        </div>
      </Card>

      {/* SECTION 2 — Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : pick(12, 14), marginBottom: pick(14, 18), width: "100%" }}>
        <MetricCard label={t("dashboard.avgDaily")} value={fmtEur(avgDailyRevenue)} sub={`${uniqueDays} ${t("dashboard.activeDays")}`} color={C.accent} isWide={isWide} />
        <MetricCard label={t("dashboard.cashPct")} value={cashPct + "%"} sub={fmtEur(totalCash)} color={C.amber} isWide={isWide} />
        <MetricCard label={t("dashboard.cardPct")} value={cardPct + "%"} sub={fmtEur(totalCard)} color={C.blue} isWide={isWide} />
        <MetricCard label={t("dashboard.xpto")} value={fmtEur(totalXpto)} sub={t("dashboard.referenceOnly")} color={C.textSub} isWide={isWide} />
      </div>

      {filtered.length === 0 && pendingInvoices === 0 && (
        <EmptyState icon="📊" title={t("dashboard.noData")} sub={t("dashboard.noDataSub")} />
      )}

      {/* SECTION 3 — Visual money flow (desktop only) */}
      {!isMobile && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pick(14, 16), marginBottom: pick(14, 18), width: "100%" }}>
          <Card>
            <div style={{ fontSize: pick(13, 14), color: C.textSub, marginBottom: pick(12, 14), fontWeight: 600 }}>{t("dashboard.revenueByWeek")}</div>
            <div style={{ position: "relative", height: chartH + 22 }}>
              <div style={{ position: "absolute", left: 0, right: 0, bottom: 22 + (weekAvg / weekMax) * chartH, borderTop: `1px dashed ${C.textMuted}`, zIndex: 1, pointerEvents: "none" }} title={`Avg: ${fmtEur(weekAvg)}`} />
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: chartH, position: "relative" }}>
                {weekData.map((d, i) => {
                  const above = d.value >= weekAvg;
                  return (
                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end" }}>
                      <div title={`${d.label}: ${fmtEur(d.value)}`} style={{ width: "100%", height: `${(d.value / weekMax) * 100}%`, minHeight: d.value > 0 ? 3 : 0, background: above ? C.accent : C.accent + "66", borderRadius: "3px 3px 0 0", transition: "background .15s" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                {weekData.map((d, i) => (
                  <span key={i} style={{ flex: 1, fontSize: 10, color: C.textMuted, textAlign: "center" }}>{d.label}</span>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, textAlign: "right" }}>— avg {fmtEur(weekAvg)}</div>
          </Card>

          <Card>
            <div style={{ fontSize: pick(13, 14), color: C.textSub, marginBottom: pick(12, 14), fontWeight: 600 }}>{t("dashboard.whereRevenueGoes")}</div>
            {totalSales > 0 ? (
              <>
                <div style={{ display: "flex", width: "100%", height: 32, borderRadius: 6, overflow: "hidden" }}>
                  {revenueBarSegments.slice(0, 3).map(seg => seg.value > 0 && (
                    <div
                      key={seg.label}
                      title={`${seg.label}: ${fmtEur(seg.value)}`}
                      style={{ width: `${(seg.value / revenueBarBase) * 100}%`, minWidth: 3, background: seg.color, flexShrink: 0 }}
                    />
                  ))}
                  {profit > 0 && (
                    <div
                      title={`${t("dashboard.netProfit")}: ${fmtEur(profit)}`}
                      style={{ flex: 1, minWidth: 3, background: C.green }}
                    />
                  )}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginTop: 14 }}>
                  {revenueBarSegments.map(seg => (
                    <div key={seg.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", fontSize: pick(12, 13), gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color, flexShrink: 0 }} />
                        <span style={{ color: C.textSub }}>{seg.label}</span>
                      </div>
                      <span style={{ color: C.text, fontWeight: 600, flexShrink: 0 }}>{fmtEur(seg.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: C.textMuted, fontSize: 13, padding: "20px 0" }}>No revenue data yet.</div>
            )}
          </Card>
        </div>
      )}

      {/* SECTION 4 — Pending payments */}
      <Card style={{ border: `1px solid ${pendingInvoices > 0 ? C.amber + "44" : C.green + "44"}`, marginBottom: pick(14, 18) }}>
        <div style={{ fontSize: pick(14, 15), fontWeight: 700, color: C.text, marginBottom: 8 }}>⏳ {t("dashboard.pendingPayments")}</div>
        {pendingInvoices > 0 ? (
          <>
            <div style={{ fontSize: pick(24, 28), fontWeight: 800, color: C.amber, marginBottom: 8 }}>{fmtEur(pendingInvoices)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginBottom: 14 }}>
              {t("dashboard.notDeducted")}
            </div>
            <div style={pendingList.length > 5 ? { maxHeight: 320, overflowY: "auto" } : undefined}>
              {pendingList.map(i => (
                <div key={i.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: pick(12, 13), gap: 8 }}>
                  <span style={{ fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 }}>{i.supplier_name}</span>
                  <span style={{ color: C.textSub, flex: 1, textAlign: "center", flexShrink: 0 }}>{i.invoice_number ? `#${i.invoice_number}` : ""}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, justifyContent: "flex-end", flex: 1 }}>
                    {i.due_date && <span style={{ color: pendingDueColor(i.due_date), fontSize: pick(11, 12) }}>{i.due_date}</span>}
                    <span style={{ color: C.amber, fontWeight: 700 }}>{fmtEur(i.total || 0)}</span>
                  </div>
                </div>
              ))}
            </div>
            {setPage && (
              <Btn
                variant="ghost"
                onClick={() => { setInvoicesInitialFilter?.("pending"); setPage("invoices"); }}
                style={{ width: "100%", marginTop: 16, justifyContent: "center" }}
              >
                {t("dashboard.viewAllInvoices")}
              </Btn>
            )}
          </>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
            <span style={{ fontSize: pick(18, 20), color: C.green, lineHeight: 1 }}>✓</span>
            <span style={{ fontSize: pick(13, 14), fontWeight: 600, color: C.green }}>No pending invoices</span>
          </div>
        )}
      </Card>

      {/* SECTION 5 — Monthly snapshot */}
      {monthlySnapshot.length > 0 && (
        <div style={{ marginBottom: pick(14, 18) }}>
          <div style={{ fontSize: pick(13, 14), color: C.textSub, fontWeight: 600, marginBottom: 10 }}>Monthly Snapshot</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: pick(12, 13) }}>
            <thead>
              <tr>
                {["Month", "Revenue", "Costs", "Net", "Margin"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: C.textMuted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, fontSize: pick(11, 12) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthlySnapshot.map(row => (
                <tr key={row.label}>
                  <td style={{ padding: "8px 10px", color: C.textSub }}>{row.label}</td>
                  <td style={{ padding: "8px 10px", color: C.green }}>{fmtEur(row.rev)}</td>
                  <td style={{ padding: "8px 10px", color: C.red }}>{fmtEur(row.costs)}</td>
                  <td style={{ padding: "8px 10px", color: row.net >= 0 ? C.green : C.red, fontWeight: 600 }}>{fmtEur(row.net)}</td>
                  <td style={{ padding: "8px 10px", color: row.margin > 20 ? C.green : C.amber }}>{row.rev ? row.margin.toFixed(1) + "%" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UpgradePrompt
        open={!!upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        feature={upgradePrompt}
        setPage={setPage}
      />
    </div>
  );
}

// ─── DAILY SALES PAGE ────────────────────────────────────────────────────────
function SaleCard({ s, venueName, onEdit, onDelete }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const total = (s.cash || 0) + (s.card || 0) - (s.cash_expenses || 0);
  const d = new Date(s.date + "T12:00:00");
  const dayLabel = d.toLocaleDateString("en-GB", { weekday: "short" });
  const dateLabel = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
      <div
        onClick={() => setExpanded(e => !e)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ minWidth: 32, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: 0.5 }}>{dayLabel}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{dateLabel}</span>
          {venueName && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 8 }}>{venueName}</span>}
        </div>
        {s.pos > 0 && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginRight: 8 }}>
            <span style={{ fontSize: 10, color: C.textMuted }}>POS</span>
            <span style={{ fontSize: 12, color: C.textSub, fontWeight: 600 }}>{fmtEur(s.pos)}</span>
          </div>
        )}
        <div style={{ fontSize: 16, fontWeight: 700, color: C.green, whiteSpace: "nowrap" }}>{fmtEur(total)}</div>
        <span style={{ fontSize: 12, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: expanded ? "rotate(180deg)" : "rotate(0deg)", marginLeft: 4, flexShrink: 0 }}>▾</span>
      </div>
      {expanded && (
        <div style={{ padding: "12px 18px 16px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 10 }}>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>{t("sales.cash")} </span><span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>{fmtEur(s.cash || 0)}</span></div>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>{t("sales.card")} </span><span style={{ fontSize: 13, color: C.blue, fontWeight: 600 }}>{fmtEur(s.card || 0)}</span></div>
            {s.cash_expenses > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>{t("sales.costs")} </span><span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>−{fmtEur(s.cash_expenses)}</span></div>}
            {s.xpto > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>{t("sales.xpto")} </span><span style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>{fmtEur(s.xpto)}</span></div>}
            {s.pos > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>{t("sales.pos")} </span><span style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>{fmtEur(s.pos)}</span></div>}
          </div>
          {(s.staff || []).length > 0 && (
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>👥 {s.staff.join(", ")}</div>
          )}
          {s.note && <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic", marginBottom: 10 }}>{s.note}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => onEdit(s)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏ {t("sales.edit")}</button>
            <button onClick={() => onDelete(s.id)} style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🗑 {t("sales.delete")}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffPicker({ staffList, selected, onChange }) {
  const { t } = useTranslation();
  if (!staffList || staffList.length === 0) return (
    <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>{t("staff.noStaffSub")}</div>
  );
  const sorted = [...staffList].sort((a, b) => {
    const ord = { active: 0, part_time: 1, holidays: 2, sick_leave: 3 };
    return (ord[a.status] ?? 0) - (ord[b.status] ?? 0) || a.name.localeCompare(b.name);
  });
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {sorted.map(m => {
        const unavail = ["holidays", "sick_leave"].includes(m.status);
        const isSelected = selected.includes(m.name);
        const color = staffStatusColor(m.status);
        const label = unavail && m.status_until
          ? `${m.name} (${m.status === "sick_leave" ? t("staff.sickLeave") : t("staff.holidays")} ${t("staff.until")} ${new Date(m.status_until + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })})`
          : m.name;
        return (
          <button key={m.id}
            onClick={() => onChange(isSelected ? selected.filter(n => n !== m.name) : [...selected, m.name])}
            style={{
              padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              border: `2px solid ${isSelected ? color : color + "40"}`,
              background: isSelected ? color : "transparent",
              color: isSelected ? "#fff" : color + "99",
              boxShadow: isSelected ? `0 2px 8px ${color}44` : "none",
              opacity: unavail ? 0.8 : 1,
            }}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

function SalesPage({ sales, addSale, updateSale, deleteSale, salesLoading, venues, venue, onVenueChange, subscription, setSubscription, staffList }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const { canScan, isFree, plan } = useSubscriptionGate(subscription);
  const scanLimit = subscription?.scan_limit ?? plan.scanLimit ?? 0;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: today(), cash: "", card: "", cashExpenses: "", xpto: "", pos: "", note: "", staff: [] });
  const [scanMode, setScanMode] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState("");
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [formVenueId, setFormVenueId] = useState("");

  const [editSale, setEditSale] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const saleVenueId = formVenueId || venue?.id || "";
  const staffForSale = saleVenueId ? staffList.filter(s => s.venue_id === saleVenueId) : [];

  const openAddModal = (scan = false) => {
    if (scan && !canScan()) { setScanLimitReached(true); return; }
    setScanMode(scan);
    setFormVenueId(venue?.id || "");
    setShowAdd(true);
  };

  const save = async () => {
    const effectiveVenueId = formVenueId || venue?.id || "";
    if (!effectiveVenueId) return;
    setSaving(true);
    setSaveError("");
    const { error } = await addSale({
      venue_id: effectiveVenueId,
      date: form.date,
      cash: parseFloat(form.cash) || 0,
      card: parseFloat(form.card) || 0,
      cash_expenses: parseFloat(form.cashExpenses) || 0,
      xpto: parseFloat(form.xpto) || 0,
      pos: parseFloat(form.pos) || 0,
      staff: form.staff,
      note: form.note,
    });
    setSaving(false);
    if (error) {
      setSaveError(error.message || "Failed to save. Try again.");
    } else {
      setShowAdd(false);
      setScanResult(null);
      setFormVenueId("");
      setForm({ date: today(), cash: "", card: "", cashExpenses: "", xpto: "", pos: "", note: "", staff: [] });
    }
  };

  const openEdit = (s) => {
    setEditSale(s);
    setEditForm({
      date: s.date,
      cash: s.cash?.toString() || "",
      card: s.card?.toString() || "",
      cashExpenses: s.cash_expenses?.toString() || "",
      xpto: s.xpto?.toString() || "",
      pos: s.pos?.toString() || "",
      note: s.note || "",
      staff: s.staff ? [...s.staff] : [],
    });
    setEditStaffInput("");
    setEditError("");
  };

  const saveEdit = async () => {
    if (!editSale || !editForm) return;
    setEditSaving(true);
    setEditError("");
    const { error } = await updateSale(editSale.id, {
      date: editForm.date,
      cash: parseFloat(editForm.cash) || 0,
      card: parseFloat(editForm.card) || 0,
      cash_expenses: parseFloat(editForm.cashExpenses) || 0,
      xpto: parseFloat(editForm.xpto) || 0,
      pos: parseFloat(editForm.pos) || 0,
      staff: editForm.staff,
      note: editForm.note,
    });
    setEditSaving(false);
    if (error) {
      setEditError(error.message || "Failed to update. Try again.");
    } else {
      setEditSale(null);
      setEditForm(null);
    }
  };

  const scanReceipt = async (file) => {
    if (!canScan()) { setScanLimitReached(true); return; }

    setScanError("");
    setScanLoading(true);
    try {
      const b64 = await fileToBase64(file);
      const prompt = "Extract daily sales data from this receipt/ticket. Return ONLY valid JSON with fields: cash (number), card (number), total (number), date (YYYY-MM-DD or null), notes (string).";
      const systemPrompt = "You are a data extraction assistant for small business expense and sales management. Extract financial data from receipt images precisely. Return only valid JSON, no markdown.";
      const result = await callClaude(prompt, systemPrompt, b64, file.type, subscription?.user_id);
      const clean = result.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      setScanResult(data);
      setForm(prev => ({
        ...prev,
        cash: data.cash?.toString() || prev.cash,
        card: data.card?.toString() || prev.card,
        pos: data.total?.toString() || prev.pos,
        date: data.date || prev.date,
        note: data.notes || prev.note,
      }));
      setScanMode(false);
      setSubscription(prev => ({
        ...prev,
        scans_used_this_month: (prev?.scans_used_this_month ?? 0) + 1,
      }));
    } catch (e) {
      setScanError(getScanErrorMessage(e));
    }
    setScanLoading(false);
  };

  if (salesLoading) {
    return (
      <div style={{ padding: "28px 32px", display: "flex", alignItems: "center", gap: 10, color: C.textSub, fontSize: 14 }}>
        <Spinner size={20} /> {t("common.loading")}
      </div>
    );
  }

  const filtered = venue ? sales.filter(s => s.venue_id === venue.id) : sales;
  // Use the actual entry dates (most recent 7) so the summary always reflects real data
  // Day-of-week average: group all entries by weekday, compute avg net revenue per day
  const DOW_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dowStats = DOW_ORDER.map(day => {
    const entries = filtered.filter(s => new Date(s.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short" }) === day);
    // Use POS report when available, otherwise fall back to cash + card
    const posTotal = entries.reduce((a, s) => a + ((s.pos > 0) ? s.pos : (s.cash || 0) + (s.card || 0)), 0);
    return { day, count: entries.length, avg: entries.length > 0 ? posTotal / entries.length : 0 };
  }).filter(d => d.count > 0);
  const bestDay = dowStats.length > 0 ? dowStats.reduce((a, b) => b.avg > a.avg ? b : a, dowStats[0]) : null;
  const overallAvg = dowStats.length > 0 ? dowStats.reduce((a, d) => a + d.avg, 0) / dowStats.length : 0;

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      {scanLimitReached && (
        <ScanLimitBanner isFree={isFree} scanLimit={scanLimit} onClose={() => setScanLimitReached(false)} />
      )}
      <PageHeader
        title={t("sales.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={isWide}
        actions={(
          <>
            <Btn variant="ghost" onClick={() => openAddModal(true)} size={isMobile ? "sm" : "md"}>{t("sales.scanReceipt")}</Btn>
            <Btn onClick={() => openAddModal(false)} size={isMobile ? "sm" : "md"}>{t("sales.addEntry")}</Btn>
          </>
        )}
      />

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={scanMode ? t("sales.scanDaily") : t("sales.title")}>
        {scanMode && !scanResult && (
          <div style={{ marginBottom: 20 }}>
            {scanError && (
              <div style={{
                background: "#F0406022",
                border: "1px solid #F0406044",
                borderRadius: 9,
                padding: "10px 14px",
                color: "#F04060",
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}>
                <span>⚠</span>
                <span>{scanError}</span>
              </div>
            )}
            {scanError && (
              <button
                type="button"
                onClick={() => { setScanError(""); setScanMode(false); }}
                style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, textDecoration: "underline" }}
              >
                Try manual entry instead
              </button>
            )}
            <ScanFirstTimeTip />
            <UploadZone onFile={scanReceipt} loading={scanLoading} label={t("sales.uploadPhoto")} />
          </div>
        )}
        {scanResult && (
          <>
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>
              ✓ {t("sales.scanned")}
            </div>
            <AiExtractionNotice variant="sales" />
          </>
        )}
        {venues.length > 0 && (
          <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="sales.selectVenueToSave" />
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><DateInput label={t("sales.date")} value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} /></div>
          <Input label={t("sales.cash")} type="number" value={form.cash} onChange={v => setForm(p => ({ ...p, cash: v }))} placeholder="0.00" prefix="€" />
          <Input label={t("sales.card")} type="number" value={form.card} onChange={v => setForm(p => ({ ...p, card: v }))} placeholder="0.00" prefix="€" />
          <Input label={t("sales.cashExpenses")} type="number" value={form.cashExpenses} onChange={v => setForm(p => ({ ...p, cashExpenses: v }))} placeholder="0.00" prefix="€" />
          <Input label={t("sales.xpto")} type="number" value={form.xpto} onChange={v => setForm(p => ({ ...p, xpto: v }))} placeholder="0.00" prefix="€" />
          <Input label={t("sales.pos")} type="number" value={form.pos} onChange={v => setForm(p => ({ ...p, pos: v }))} placeholder="0.00" prefix="€" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>{t("sales.staffAttendance")}</div>
            <StaffPicker staffList={staffForSale} selected={form.staff} onChange={v => setForm(p => ({ ...p, staff: v }))} />
          </div>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("sales.notes")} value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} placeholder={t("common.optional")} /></div>
        </div>
        {saveError && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{saveError}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setSaveError(""); }}>{t("common.cancel")}</Btn>
          <Btn onClick={save} loading={saving} disabled={!formVenueId || saving}>{t("sales.saveEntry")}</Btn>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editForm && (
        <Modal open={!!editSale} onClose={() => { setEditSale(null); setEditForm(null); }} title={t("sales.edit")}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><DateInput label={t("sales.date")} value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} /></div>
            <Input label={t("sales.cash")} type="number" value={editForm.cash} onChange={v => setEditForm(p => ({ ...p, cash: v }))} placeholder="0.00" prefix="€" />
            <Input label={t("sales.card")} type="number" value={editForm.card} onChange={v => setEditForm(p => ({ ...p, card: v }))} placeholder="0.00" prefix="€" />
            <Input label={t("sales.cashExpenses")} type="number" value={editForm.cashExpenses} onChange={v => setEditForm(p => ({ ...p, cashExpenses: v }))} placeholder="0.00" prefix="€" />
            <Input label={t("sales.xpto")} type="number" value={editForm.xpto} onChange={v => setEditForm(p => ({ ...p, xpto: v }))} placeholder="0.00" prefix="€" />
            <Input label={t("sales.pos")} type="number" value={editForm.pos} onChange={v => setEditForm(p => ({ ...p, pos: v }))} placeholder="0.00" prefix="€" />
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>{t("sales.staffAttendance")}</div>
              <StaffPicker staffList={staffList} selected={editForm.staff || []} onChange={v => setEditForm(p => ({ ...p, staff: v }))} />
            </div>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("sales.notes")} value={editForm.note} onChange={v => setEditForm(p => ({ ...p, note: v }))} placeholder={t("common.optional")} /></div>
          </div>
          {editError && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{editError}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => { setEditSale(null); setEditForm(null); }}>{t("common.cancel")}</Btn>
            <Btn onClick={saveEdit} loading={editSaving} disabled={editSaving}>{t("common.save")}</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0
            ? <EmptyState icon="💳" title={t("sales.noEntries")} sub={t("sales.noEntriesSub")} action={<Btn onClick={() => openAddModal(false)}>{t("sales.addFirst")}</Btn>} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
                  const venueName = venues.find(v => v.id === s.venue_id)?.name || "";
                  return (
                    <SaleCard key={s.id} s={s} venueName={venueName} onEdit={openEdit} onDelete={deleteSale} />
                  );
                })}
              </div>
            )}
        </div>
        {isWide && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <Card style={{ position: "sticky", top: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8, marginBottom: 4 }}>Avg Sales by Day of Week</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 14, opacity: 0.7 }}>POS avg per weekday (all time)</div>
              {dowStats.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textMuted, padding: "8px 0" }}>No entries yet</div>
              ) : dowStats.map(d => {
                const isBest = d.day === bestDay?.day;
                return (
                  <div key={d.day} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 8px", borderRadius: 8, marginBottom: 2, background: isBest ? C.accentDim : "transparent" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: isBest ? C.accent : C.textSub, minWidth: 30 }}>{d.day}</span>
                      <span style={{ fontSize: 10, color: C.textMuted }}>×{d.count}</span>
                      {isBest && <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, background: C.accent + "22", padding: "1px 5px", borderRadius: 4, letterSpacing: 0.5 }}>BEST</span>}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isBest ? C.accent : C.text }}>{fmtEur(d.avg)}</span>
                  </div>
                );
              })}
              <div style={{ paddingTop: 12, marginTop: 6, borderTop: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>Best day</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>{bestDay?.day || "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: C.textMuted }}>Daily avg</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.green }}>{overallAvg > 0 ? fmtEur(overallAvg) : "—"}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── INVOICES PAGE ───────────────────────────────────────────────────────────
// ─── STAFF PAGE ───────────────────────────────────────────────────────────────
const STAFF_STATUS_COLORS = {
  active: "#22C55E",
  part_time: "#60A5FA",
  holidays: "#F59E0B",
  sick_leave: "#F04060",
};

function staffStatusColor(status) {
  return STAFF_STATUS_COLORS[status] || C.textMuted;
}

function staffStatusLabel(member, t) {
  const labels = {
    active: t("staff.active"),
    part_time: t("staff.partTime"),
    holidays: t("staff.holidays"),
    sick_leave: t("staff.sickLeave"),
  };
  const label = labels[member.status] || t("staff.active");
  if (["holidays", "sick_leave"].includes(member.status) && member.status_until) {
    const d = new Date(member.status_until + "T12:00:00");
    return `${label} ${t("staff.until")} ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })}`;
  }
  return label;
}

function StaffPage({ staff, addStaff, updateStaff, deleteStaff, venue, venues, onVenueChange }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const STAFF_STATUSES = [
    { value: "active",     label: t("staff.active"),       color: STAFF_STATUS_COLORS.active },
    { value: "part_time",  label: t("staff.partTime"),    color: STAFF_STATUS_COLORS.part_time },
    { value: "holidays",   label: t("staff.holidays"),  color: STAFF_STATUS_COLORS.holidays },
    { value: "sick_leave", label: t("staff.sickLeave"),   color: STAFF_STATUS_COLORS.sick_leave },
  ];
  const EMPTY_FORM = { name: "", birth_date: "", phone: "", job_title: "", status: "active", status_from: "", status_until: "" };
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formVenueId, setFormVenueId] = useState("");

  const filtered = filterByVenue(staff, venue);
  const sorted = [...filtered].sort((a, b) => {
    const ord = { active: 0, part_time: 1, holidays: 2, sick_leave: 3 };
    return (ord[a.status] ?? 0) - (ord[b.status] ?? 0) || a.name.localeCompare(b.name);
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setFormVenueId(venue?.id || ""); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ name: m.name || "", birth_date: m.birth_date || "", phone: m.phone || "", job_title: m.job_title || "", status: m.status || "active", status_from: m.status_from || "", status_until: m.status_until || "" });
    setEditing(m);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const effectiveVenueId = editing ? editing.venue_id : (formVenueId || venue?.id || "");
    if (!editing && !effectiveVenueId) return;
    setSaving(true);
    const needsDates = ["holidays", "sick_leave"].includes(form.status);
    const payload = {
      venue_id: effectiveVenueId || null,
      name: form.name.trim(),
      birth_date: form.birth_date || null,
      phone: form.phone || null,
      job_title: form.job_title || null,
      status: form.status,
      status_from: needsDates ? (form.status_from || null) : null,
      status_until: needsDates ? (form.status_until || null) : null,
    };
    if (editing) await updateStaff(editing.id, payload);
    else await addStaff(payload);
    setSaving(false);
    setShowModal(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this staff member?")) return;
    setDeletingId(id);
    await deleteStaff(id);
    setDeletingId(null);
  };

  const needsDates = ["holidays", "sick_leave"].includes(form.status);

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      <PageHeader
        title={t("staff.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={false}
        actions={<Btn onClick={openAdd}>{t("staff.addStaff")}</Btn>}
      />

      {sorted.length === 0 ? (
        <EmptyState icon="👥" title={t("staff.noStaff")} sub={t("staff.noStaffSub")} action={<Btn onClick={openAdd}>{t("staff.addStaff")}</Btn>} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sorted.map(m => {
            const color = staffStatusColor(m.status);
            return (
              <div key={m.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: color + "22", border: `2px solid ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color, flexShrink: 0 }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{m.name}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, background: color + "1A", color, padding: "1px 8px", borderRadius: 99, border: `1px solid ${color}44`, textTransform: "uppercase", letterSpacing: 0.4, whiteSpace: "nowrap" }}>
                      {staffStatusLabel(m, t)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                    {m.job_title && <span style={{ fontSize: 12, color: C.textSub }}>{m.job_title}</span>}
                    {m.phone && <span style={{ fontSize: 12, color: C.textMuted }}>{m.phone}</span>}
                    {m.birth_date && <span style={{ fontSize: 12, color: C.textMuted }}>{new Date(m.birth_date + "T12:00:00").toLocaleDateString("en-GB")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(m)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏ {t("common.edit")}</button>
                  <button onClick={() => handleDelete(m.id)} disabled={!!deletingId} style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: deletingId === m.id ? 0.4 : 1 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? t("staff.title") : t("staff.addStaff")}>
        {!editing && (
          <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="staff.selectVenueToSave" />
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Input label={t("staff.name") + " *"} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Ana Silva" />
          <Input label={t("staff.jobTitle")} value={form.job_title} onChange={v => setForm(p => ({ ...p, job_title: v }))} placeholder="e.g. Chef, Waiter" />
          <Input label={t("staff.phone")} value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351..." />
          <DateInput label={t("staff.birthDate")} value={form.birth_date} onChange={v => setForm(p => ({ ...p, birth_date: v }))} />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>{t("staff.status")}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STAFF_STATUSES.map(opt => (
                <button key={opt.value} onClick={() => setForm(p => ({ ...p, status: opt.value }))}
                  style={{ padding: "5px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.12s", border: `1px solid ${form.status === opt.value ? opt.color : C.border}`, background: form.status === opt.value ? opt.color + "22" : "transparent", color: form.status === opt.value ? opt.color : C.textSub }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {needsDates && (
            <>
              <DateInput label={t("staff.from")} value={form.status_from} onChange={v => setForm(p => ({ ...p, status_from: v }))} />
              <DateInput label={t("staff.until")} value={form.status_until} onChange={v => setForm(p => ({ ...p, status_until: v }))} />
            </>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setShowModal(false)}>{t("common.cancel")}</Btn>
          <Btn onClick={save} loading={saving} disabled={!form.name.trim() || saving || (!editing && !formVenueId && !venue)}>{editing ? t("common.save") : t("staff.addStaff")}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function DueDateBadge({ dueDate }) {
  const { t } = useTranslation();
  if (!dueDate) return null;
  const due = new Date(dueDate + "T12:00:00");
  const now = new Date();
  const daysLeft = Math.ceil((due - now) / 86400000);
  const isOverdue = daysLeft < 0;
  const isSoon = !isOverdue && daysLeft <= 7;
  const color = isOverdue ? C.red : isSoon ? C.amber : C.textSub;
  const bg = isOverdue ? "#F0406014" : isSoon ? C.amber + "18" : C.surfaceL;
  const label = isOverdue
    ? `${t("invoices.overdue")} ${Math.abs(daysLeft)}d`
    : isSoon
    ? `${t("invoices.dueDate")} ${daysLeft}d`
    : `${t("invoices.dueDate")} ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  return (
    <span style={{ background: bg, border: `1px solid ${color}55`, color, borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: 0.2 }}>
      {label}
    </span>
  );
}

function AmountsRow({ subtotal, tax, total, totalColor, isMobile }) {
  const { t } = useTranslation();
  const labelSize = isMobile ? 8 : 9;
  return (
    <div style={{ display: "flex", gap: isMobile ? 4 : 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: labelSize, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{t("invoices.net")}</div>
        <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: C.text }}>{fmtEur(subtotal || 0)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: labelSize, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{t("invoices.tax")}</div>
        <div style={{ fontSize: isMobile ? 12 : 13, color: C.textSub }}>{fmtEur(tax || 0)}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: labelSize, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{t("invoices.total")}</div>
        <div style={{ fontSize: isMobile ? 13 : 14, fontWeight: 700, color: totalColor || C.text }}>{fmtEur(total || 0)}</div>
      </div>
    </div>
  );
}

function SupplierInvoiceGroup({ name, invs, onMarkPaid, onEdit, payingId, isMobile }) {
  const { t } = useTranslation();
  const pending = invs.filter(i => i.status === "pending");
  const paid = invs.filter(i => i.status === "paid");
  const [open, setOpen] = useState(false);
  const [expandedPaidId, setExpandedPaidId] = useState(null);
  const pendingTotal = pending.reduce((a, i) => a + (i.total || 0), 0);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>

      {/* ── COLLAPSED HEADER ── */}
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", padding: "11px 16px", cursor: "pointer", userSelect: "none", gap: 12 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: C.text, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left" }}>{name}</span>
        {pending.length > 0 ? (
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: isMobile ? 8 : 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Pending invoices</div>
              <div style={{ fontSize: isMobile ? 12 : 13, color: C.amber, fontWeight: 700 }}>{pending.length}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: isMobile ? 58 : 70 }}>
              <div style={{ fontSize: isMobile ? 8 : 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount due</div>
              <div style={{ fontSize: isMobile ? 13 : 14, color: C.amber, fontWeight: 700 }}>{fmtEur(pendingTotal)}</div>
            </div>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: C.green, fontWeight: 600, flexShrink: 0 }}>✓ All paid</span>
        )}
        <span style={{ fontSize: 11, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: open ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0, marginLeft: 2 }}>▾</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}` }}>

          {/* ── PENDING INVOICES ── */}
          {pending.length > 0 && (
            <div style={{ padding: "10px 14px" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{t("invoices.pending")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pending.map(inv => (
                  <div key={inv.id} style={{ background: C.surfaceL, borderRadius: 9, padding: "9px 12px" }}>
                    {isMobile ? (
                      <div style={{ marginBottom: 7 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>
                          {inv.invoice_number
                            ? <><span style={{ color: C.textMuted, fontWeight: 400 }}>Invoice Nr: </span>{`#${inv.invoice_number}`}</>
                            : <span style={{ color: C.textMuted, fontStyle: "italic" }}>No ref.</span>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>{inv.date}</span>
                          {inv.due_date && <DueDateBadge dueDate={inv.due_date} />}
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" onClick={() => onEdit(inv)} style={{
                            flex: 1, background: C.accentDim, border: `1px solid ${C.accent}44`,
                            color: C.accent, borderRadius: 8, padding: "11px 0", fontSize: 12,
                            cursor: "pointer", fontWeight: 600, textAlign: "center", minHeight: 44,
                          }}>✏ {t("common.edit")}</button>
                          <Btn variant="green" size="sm" loading={payingId === inv.id}
                            onClick={() => onMarkPaid(inv.id)}
                            style={{ flex: 1, justifyContent: "center", minHeight: 44, padding: "11px 0" }}>
                            {t("invoices.markPaid")}
                          </Btn>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: "0 0 auto" }}>
                          {inv.invoice_number ? <><span style={{ color: C.textMuted, fontWeight: 400 }}>Invoice Nr: </span>{`#${inv.invoice_number}`}</> : <span style={{ color: C.textMuted, fontStyle: "italic" }}>No ref.</span>}
                        </span>
                        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>{inv.date}</span>
                          {inv.due_date && <DueDateBadge dueDate={inv.due_date} />}
                        </div>
                        <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                          <button type="button" onClick={() => onEdit(inv)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>✏ {t("common.edit")}</button>
                          <Btn variant="green" size="sm" loading={payingId === inv.id} onClick={() => onMarkPaid(inv.id)}>{t("invoices.markPaid")}</Btn>
                        </div>
                      </div>
                    )}
                    <AmountsRow subtotal={inv.subtotal} tax={inv.tax} total={inv.total} totalColor={C.amber} isMobile={isMobile} />
                    {inv.items && inv.items.length > 0 && (
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>{inv.items.slice(0, 3).map(i => i.name).join(", ")}{inv.items.length > 3 ? ` +${inv.items.length - 3} more` : ""}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PAID INVOICES ── */}
          {paid.length > 0 && (
            <div style={{ padding: "10px 14px", borderTop: pending.length > 0 ? `1px solid ${C.border}` : undefined }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{t("invoices.paid")}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {paid.map(inv => (
                  <div key={inv.id} style={{ borderRadius: 7, overflow: "hidden" }}>
                    {isMobile ? (
                      <div onClick={() => setExpandedPaidId(id => id === inv.id ? null : inv.id)}
                        style={{ padding: "9px 10px", cursor: "pointer", background: expandedPaidId === inv.id ? C.surfaceL : "transparent" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
                            {inv.invoice_number ? `#${inv.invoice_number}` : "No ref."}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.green, flexShrink: 0 }}>
                            {fmtEur(inv.total || 0)}
                          </span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: C.textMuted }}>{inv.date}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Badge color={C.green}>{t("invoices.paid")}</Badge>
                            <span style={{ fontSize: 10, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: expandedPaidId === inv.id ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => setExpandedPaidId(id => id === inv.id ? null : inv.id)}
                        style={{ display: "flex", alignItems: "center", gap: 0, padding: "7px 8px", cursor: "pointer", background: expandedPaidId === inv.id ? C.surfaceL : "transparent" }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub, flex: "0 0 90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {inv.invoice_number ? `Invoice Nr: #${inv.invoice_number}` : "No ref."}
                        </span>
                        <span style={{ fontSize: 11, color: C.textMuted, flex: "0 0 80px" }}>{inv.date}</span>
                        <span style={{ flex: 1 }} />
                        <Badge color={C.green}>{t("invoices.paid")}</Badge>
                        <span style={{ fontSize: 13, fontWeight: 700, color: C.green, minWidth: 72, textAlign: "right", marginLeft: 8 }}>{fmtEur(inv.total || 0)}</span>
                        <span style={{ fontSize: 10, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: expandedPaidId === inv.id ? "rotate(180deg)" : "rotate(0deg)", marginLeft: 6, flexShrink: 0 }}>▾</span>
                      </div>
                    )}
                    {expandedPaidId === inv.id && (
                      <div style={{ padding: "8px 10px 10px", background: C.surfaceL, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ marginBottom: 6 }}>
                          <AmountsRow subtotal={inv.subtotal} tax={inv.tax} total={inv.total} totalColor={C.green} isMobile={isMobile} />
                        </div>
                        {inv.due_date && <div style={{ marginBottom: 6 }}><DueDateBadge dueDate={inv.due_date} /></div>}
                        {inv.items && inv.items.length > 0 && (
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{inv.items.slice(0, 3).map(i => i.name).join(", ")}{inv.items.length > 3 ? ` +${inv.items.length - 3} more` : ""}</div>
                        )}
                        <div style={{ display: "flex", justifyContent: isMobile ? "stretch" : "flex-end" }}>
                          <button type="button" onClick={() => onEdit(inv)} style={{
                            background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 6,
                            padding: isMobile ? "11px 0" : "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600,
                            width: isMobile ? "100%" : undefined, textAlign: "center", minHeight: isMobile ? 44 : undefined,
                          }}>✏ {t("common.edit")}</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InvoicesPage({ invoices, addInvoice, updateInvoice, markInvoicePaid, suppliers, addSupplier, upsertStockItem, venue, venues, onVenueChange, subscription, setSubscription, initialStatusFilter, setPage }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const { canScan, canMultiScan, scansRemaining, isFree, plan } = useSubscriptionGate(subscription);
  const scanLimit = subscription?.scan_limit ?? plan.scanLimit ?? 0;
  const multiScanEnabled = canMultiScan();
  const fileInputRef = useRef(null);
  const [showScan, setShowScan] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState("");
  const [extracted, setExtracted] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [scanQueue, setScanQueue] = useState([]);
  const [currentScanIndex, setCurrentScanIndex] = useState(-1);
  const [expandedQueueId, setExpandedQueueId] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ supplier: "", invoiceNumber: "", date: today(), dueDate: "", subtotal: "", tax: "", total: "", iban: "", nif: "" });
  const [savingManual, setSavingManual] = useState(false);
  const [savingExtracted, setSavingExtracted] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter || "all");
  useEffect(() => {
    if (initialStatusFilter) setStatusFilter(initialStatusFilter);
  }, [initialStatusFilter]);
  const [toast, setToast] = useState("");
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [editInvoice, setEditInvoice] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [formVenueId, setFormVenueId] = useState("");

  const openScanPicker = () => {
    if (!canScan()) { setScanLimitReached(true); return; }
    fileInputRef.current?.click();
  };

  const bumpScanUsageOptimistic = () => {
    setSubscription(prev => ({
      ...prev,
      scans_used_this_month: (prev?.scans_used_this_month ?? 0) + 1,
    }));
  };

  const revokeQueueThumbs = (queue) => {
    queue.forEach(item => { if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl); });
  };

  const openManualModal = () => {
    setFormVenueId(venue?.id || "");
    setShowManual(true);
  };

  const closeScanModal = () => {
    revokeQueueThumbs(scanQueue);
    setShowScan(false);
    setExtracted(null);
    setEditItems([]);
    setScanQueue([]);
    setCurrentScanIndex(-1);
    setExpandedQueueId(null);
    setScanError("");
    setFormVenueId("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const closeManualModal = () => {
    setShowManual(false);
    setSelectedSupplierId("");
    setFormVenueId("");
    setManualForm({ supplier: "", invoiceNumber: "", date: today(), dueDate: "", subtotal: "", tax: "", total: "", iban: "", nif: "" });
  };

  const byVenue = venue ? invoices.filter(i => i.venue_id === venue.id) : invoices;
  const visible = statusFilter === "all" ? byVenue : byVenue.filter(i => i.status === statusFilter);

  const supplierGroups = [...new Set(visible.map(i => i.supplier_name || "Unknown"))]
    .map(name => ({ name, invs: visible.filter(i => (i.supplier_name || "Unknown") === name) }))
    .sort((a, b) => {
      const ap = a.invs.filter(i => i.status === "pending").length;
      const bp = b.invs.filter(i => i.status === "pending").length;
      return bp - ap || b.invs.length - a.invs.length;
    });

  const processBatchSequentially = async (queue) => {
    for (let i = 0; i < queue.length; i++) {
      setCurrentScanIndex(i);
      setScanQueue(prev => prev.map((item, idx) =>
        idx === i ? { ...item, status: "scanning", error: null } : item
      ));

      try {
        const data = await extractInvoiceFromImage(queue[i].file, subscription?.user_id);
        setScanQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "done", result: data, editItems: data.items || [] } : item
        ));
        bumpScanUsageOptimistic();
        trackEvent("invoice_scanned");
      } catch (err) {
        setScanQueue(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: "error", error: getScanErrorMessage(err) } : item
        ));
      }
    }
    setCurrentScanIndex(-1);
  };

  const handleFileSelect = (e) => {
    let files = Array.from(e.target.files || []);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (files.length === 0) return;

    if (!canScan()) { setScanLimitReached(true); return; }

    if (!multiScanEnabled) {
      files = files.slice(0, 1);
    } else {
      const remaining = scansRemaining();
      if (remaining <= 0) { setScanLimitReached(true); return; }
      if (files.length > remaining) {
        setScanError(`Only ${remaining} scan${remaining !== 1 ? "s" : ""} remaining this month — ${Math.min(files.length, remaining)} of ${files.length} photos queued.`);
      }
      files = files.slice(0, remaining);
    }

    if (files.length === 0) return;

    setFormVenueId(venue?.id || "");
    setShowScan(true);
    setExtracted(null);
    setEditItems([]);
    setExpandedQueueId(null);

    if (files.length === 1) {
      setScanQueue([]);
      scanInvoice(files[0]);
      return;
    }

    const queue = files.map(file => ({
      id: uid(),
      file,
      thumbUrl: URL.createObjectURL(file),
      status: "pending",
      result: null,
      editItems: [],
      error: null,
    }));
    setScanQueue(queue);
    processBatchSequentially(queue);
  };

  const retryQueueItem = async (itemId) => {
    if (!canScan()) { setScanLimitReached(true); return; }
    const idx = scanQueue.findIndex(item => item.id === itemId);
    const item = scanQueue[idx];
    if (!item?.file) return;

    setCurrentScanIndex(idx);
    setScanQueue(prev => prev.map(q =>
      q.id === itemId ? { ...q, status: "scanning", error: null } : q
    ));

    try {
      const data = await extractInvoiceFromImage(item.file, subscription?.user_id);
      setScanQueue(prev => prev.map(q =>
        q.id === itemId ? { ...q, status: "done", result: data, editItems: data.items || [], error: null } : q
      ));
      bumpScanUsageOptimistic();
      trackEvent("invoice_scanned");
    } catch (err) {
      setScanQueue(prev => prev.map(q =>
        q.id === itemId ? { ...q, status: "error", error: getScanErrorMessage(err) } : q
      ));
    }
    setCurrentScanIndex(-1);
  };

  const skipQueueItem = (itemId) => {
    setScanQueue(prev => prev.map(item =>
      item.id === itemId ? { ...item, status: "skipped" } : item
    ));
    if (expandedQueueId === itemId) setExpandedQueueId(null);
  };

  const updateQueueExtracted = (itemId, updater) => {
    setScanQueue(prev => prev.map(item =>
      item.id === itemId ? { ...item, result: typeof updater === "function" ? updater(item.result) : updater } : item
    ));
  };

  const updateQueueLineItem = (itemId, index, field, rawValue) => {
    setScanQueue(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const editItemsNext = item.editItems.map((line, i) => {
        if (i !== index) return line;
        const updated = { ...line };
        if (field === "name" || field === "unit") {
          updated[field] = rawValue;
        } else {
          const num = parseFloat(rawValue);
          updated[field] = rawValue === "" ? "" : (Number.isNaN(num) ? line[field] : num);
          if (field === "qty" || field === "unitPrice") {
            const qty = parseFloat(field === "qty" ? rawValue : updated.qty) || 0;
            const unitPrice = parseFloat(field === "unitPrice" ? rawValue : updated.unitPrice) || 0;
            updated.total = qty * unitPrice;
          }
        }
        return updated;
      });
      return { ...item, editItems: editItemsNext };
    }));
  };

  const saveOneExtracted = async (data, items, effectiveVenueId) => {
    const existsByNif = suppliers.find(s => s.nif && s.nif === data.supplierNIF && s.venue_id === effectiveVenueId);
    if (!existsByNif) {
      await addSupplier({
        name: data.supplierName || "Unknown",
        nif: data.supplierNIF || null,
        iban: data.supplierIBAN || null,
        address: data.supplierAddress || null,
        phone: data.supplierPhone || null,
        email: null,
        category: null,
        venue_id: effectiveVenueId,
      });
    }

    await addInvoice({
      venueId: effectiveVenueId,
      supplierName: data.supplierName || "Unknown",
      supplierNif: data.supplierNIF || null,
      supplierIban: data.supplierIBAN || null,
      date: data.date || today(),
      dueDate: data.dueDate || null,
      invoiceNumber: data.invoiceNumber || "",
      items,
      ...computeInvoiceReviewTotals(data, items),
    });

    for (const item of items) {
      await upsertStockItem({
        name: item.name,
        unit: item.unit || "un",
        last_price: item.unitPrice,
        supplier: data.supplierName || "",
        venue_id: effectiveVenueId,
      });
    }
  };

  const handleSupplierSelect = (id) => {
    setSelectedSupplierId(id);
    const sup = suppliers.find(s => s.id === id);
    if (sup) setManualForm(prev => ({ ...prev, supplier: sup.name, nif: sup.nif || "", iban: sup.iban || "" }));
  };

  const scanInvoice = async (file) => {
    if (!canScan()) { setScanLimitReached(true); return; }

    setScanError("");
    setScanLoading(true);
    try {
      const data = await extractInvoiceFromImage(file, subscription?.user_id);
      setExtracted(data);
      setEditItems(data.items || []);
      bumpScanUsageOptimistic();
      trackEvent("invoice_scanned");
    } catch (e) {
      setScanError(getScanErrorMessage(e));
    }
    setScanLoading(false);
  };

  const saveExtracted = async () => {
    if (!extracted) return;
    const effectiveVenueId = formVenueId || venue?.id || "";
    if (!effectiveVenueId) return;
    setSavingExtracted(true);
    await saveOneExtracted(extracted, editItems, effectiveVenueId);
    setSavingExtracted(false);
    setExtracted(null);
    setEditItems([]);
    closeScanModal();
  };

  const saveAllExtracted = async () => {
    const effectiveVenueId = formVenueId || venue?.id || "";
    if (!effectiveVenueId) return;
    const doneItems = scanQueue.filter(item => item.status === "done" && item.result);
    if (doneItems.length === 0) return;
    setSavingExtracted(true);
    for (const item of doneItems) {
      await saveOneExtracted(item.result, item.editItems, effectiveVenueId);
    }
    setSavingExtracted(false);
    closeScanModal();
  };

  const saveManual = async () => {
    if (!manualForm.supplier.trim()) return;
    const effectiveVenueId = formVenueId || venue?.id || "";
    if (!effectiveVenueId) return;
    setSavingManual(true);
    // Auto-create supplier profile if not already in DB
    const existsByName = suppliers.find(s =>
      s.name.toLowerCase() === manualForm.supplier.trim().toLowerCase() && s.venue_id === effectiveVenueId
    );
    if (!existsByName) {
      await addSupplier({
        name: manualForm.supplier.trim(),
        nif: manualForm.nif || null,
        iban: manualForm.iban || null,
        address: null,
        phone: null,
        email: null,
        category: null,
        venue_id: effectiveVenueId,
      });
    }
    await addInvoice({
      venueId: effectiveVenueId,
      supplierName: manualForm.supplier,
      supplierNif: manualForm.nif || null,
      supplierIban: manualForm.iban || null,
      date: manualForm.date,
      dueDate: manualForm.dueDate || null,
      invoiceNumber: manualForm.invoiceNumber || "",
      items: [],
      subtotal: parseFloat(manualForm.subtotal) || 0,
      tax: parseFloat(manualForm.tax) || 0,
      total: parseFloat(manualForm.total) || 0,
    });
    setSavingManual(false);
    closeManualModal();
  };

  const openEdit = (inv) => {
    setEditInvoice(inv);
    setEditForm({ supplier: inv.supplier_name || "", invoiceNumber: inv.invoice_number || "", date: inv.date || today(), dueDate: inv.due_date || "", subtotal: inv.subtotal?.toString() || "", tax: inv.tax?.toString() || "", total: inv.total?.toString() || "", iban: inv.supplier_iban || "", nif: inv.supplier_nif || "" });
  };

  const saveEdit = async () => {
    if (!editInvoice || !editForm) return;
    setSavingEdit(true);
    await updateInvoice(editInvoice.id, {
      supplier_name: editForm.supplier,
      supplier_nif: editForm.nif || null,
      supplier_iban: editForm.iban || null,
      date: editForm.date,
      due_date: editForm.dueDate || null,
      invoice_number: editForm.invoiceNumber || null,
      subtotal: parseFloat(editForm.subtotal) || 0,
      tax: parseFloat(editForm.tax) || 0,
      total: parseFloat(editForm.total) || 0,
    });
    setSavingEdit(false);
    setEditInvoice(null);
    setEditForm(null);
  };

  const handleMarkPaid = async (id) => {
    setPayingId(id);
    await markInvoicePaid(id);
    setPayingId(null);
    setToast(t("invoices.markedPaid"));
    setTimeout(() => setToast(""), 2500);
  };

  const pendingCount = byVenue.filter(i => i.status === "pending").length;
  const paidCount   = byVenue.filter(i => i.status === "paid").length;

  const sumTotal   = byVenue.reduce((a, i) => a + (i.total || 0), 0);
  const sumPending = byVenue.filter(i => i.status === "pending").reduce((a, i) => a + (i.total || 0), 0);
  const sumPaid    = byVenue.filter(i => i.status === "paid").reduce((a, i) => a + (i.total || 0), 0);
  const supplierCount = new Set(byVenue.map(i => i.supplier_name).filter(Boolean)).size;
  const invoiceVenueId = formVenueId || venue?.id || "";
  const suppliersForInvoice = invoiceVenueId ? suppliers.filter(s => s.venue_id === invoiceVenueId) : [];
  const batchDoneCount = scanQueue.filter(item => item.status === "done" && item.result).length;
  const isBatchMode = scanQueue.length > 1;

  const updateLineItem = (index, field, rawValue) => {
    setEditItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item };
      if (field === "name" || field === "unit") {
        updated[field] = rawValue;
      } else {
        const num = parseFloat(rawValue);
        updated[field] = rawValue === "" ? "" : (Number.isNaN(num) ? item[field] : num);
        if (field === "qty" || field === "unitPrice") {
          const qty = parseFloat(field === "qty" ? rawValue : updated.qty) || 0;
          const unitPrice = parseFloat(field === "unitPrice" ? rawValue : updated.unitPrice) || 0;
          updated.total = qty * unitPrice;
        }
      }
      return updated;
    }));
  };

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple={multiScanEnabled}
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <AllVenuesBanner venue={venue} />
      {scanLimitReached && (
        <ScanLimitBanner isFree={isFree} scanLimit={scanLimit} onClose={() => setScanLimitReached(false)} />
      )}
      <PageHeader
        title={t("invoices.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={isWide}
        actions={(
          <>
            <Btn variant="ghost" size={isMobile ? "sm" : "md"} onClick={openManualModal}>{t("invoices.manualEntry")}</Btn>
            <Btn size={isMobile ? "sm" : "md"} onClick={openScanPicker}>
              {multiScanEnabled ? "📷 Scan Invoice(s)" : t("invoices.scanInvoice")}
            </Btn>
          </>
        )}
      />

      {/* INVOICE SUMMARY — hide on wide (shown in right panel instead) */}
      {byVenue.length > 0 && !isWide && (
        <div style={{ padding: "12px 18px", background: C.surfaceL, borderRadius: 10, marginBottom: 16, fontSize: 13, border: `1px solid ${C.border}` }}>
          {isMobile ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("invoices.invoices")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{byVenue.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("invoices.total")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{fmtEur(sumTotal)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("invoices.pending")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.amber }}>{fmtEur(sumPending)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{t("invoices.paid")}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: C.green }}>{fmtEur(sumPaid)}</div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
              <span style={{ color: C.textSub }}>{byVenue.length} {t("invoices.invoices")}</span>
              <span>{t("invoices.total")}: <strong style={{ color: C.text }}>{fmtEur(sumTotal)}</strong></span>
              <span>{t("invoices.pending")}: <strong style={{ color: C.amber }}>{fmtEur(sumPending)}</strong></span>
              <span>{t("invoices.paid")}: <strong style={{ color: C.green }}>{fmtEur(sumPaid)}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* STATUS FILTER BAR */}
      <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { val: "all",     label: `${t("invoices.filterAll")} (${byVenue.length})` },
          { val: "pending", label: `${t("invoices.filterPending")} (${pendingCount})`, color: C.amber },
          { val: "paid",    label: `${t("invoices.filterPaid")} (${paidCount})`,    color: C.green },
        ].map(({ val, label, color }) => {
          const active = statusFilter === val;
          const ac = color || C.accent;
          return (
            <button key={val} onClick={() => setStatusFilter(val)}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${active ? ac : C.border}`, background: active ? ac + "22" : "transparent", color: active ? ac : C.textSub, fontSize: 12, cursor: "pointer", fontWeight: active ? 600 : 400 }}>
              {label}
            </button>
          );
        })}
      </div>

      {/* SCAN MODAL */}
      <Modal open={showScan} onClose={closeScanModal} title={t("invoices.scanTitle")} width={700}>
        {isBatchMode ? (
          <div>
            {scanError && (
              <div style={{ background: "#F5A62322", border: "1px solid #F5A62344", borderRadius: 9, padding: "10px 14px", color: C.amber, fontSize: 13, marginBottom: 16 }}>
                {scanError}
              </div>
            )}
            {currentScanIndex >= 0 && (
              <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14, fontWeight: 600 }}>
                Processing {currentScanIndex + 1} of {scanQueue.length}…
              </div>
            )}
            {currentScanIndex === -1 && batchDoneCount > 0 && (
              <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>
                ✓ {batchDoneCount} of {scanQueue.length} invoices ready to review
              </div>
            )}
            <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="invoices.selectVenueToSave" />
            {currentScanIndex === -1 && batchDoneCount > 0 && (
              <AiExtractionNotice variant="batch" />
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {scanQueue.map(item => (
                <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, overflow: "hidden", background: C.surfaceL }}>
                  <button
                    type="button"
                    onClick={() => item.status === "done" && setExpandedQueueId(id => id === item.id ? null : item.id)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                      background: expandedQueueId === item.id ? C.surface : "transparent",
                      border: "none", cursor: item.status === "done" ? "pointer" : "default", textAlign: "left",
                    }}
                  >
                    {item.thumbUrl && (
                      <img src={item.thumbUrl} alt="" style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.file.name}
                      </div>
                      {item.status === "done" && item.result?.supplierName && (
                        <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{item.result.supplierName}</div>
                      )}
                      {item.status === "error" && (
                        <div style={{ fontSize: 11, color: C.red, marginTop: 2 }}>{item.error}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{queueStatusIcon(item.status)}</span>
                  </button>
                  {item.status === "error" && (
                    <div style={{ display: "flex", gap: 8, padding: "0 12px 10px" }}>
                      <Btn size="sm" variant="ghost" onClick={() => retryQueueItem(item.id)}>Retry</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => skipQueueItem(item.id)}>Skip</Btn>
                    </div>
                  )}
                  {expandedQueueId === item.id && item.status === "done" && item.result && (
                    <div style={{ padding: "0 12px 12px", borderTop: `1px solid ${C.border}` }}>
                      <InvoiceScanReviewPanel
                        t={t}
                        isMobile={isMobile}
                        venues={venues}
                        formVenueId={formVenueId}
                        onVenueChange={setFormVenueId}
                        extracted={item.result}
                        editItems={item.editItems}
                        onExtractedChange={updater => updateQueueExtracted(item.id, updater)}
                        onLineItemChange={(i, field, val) => updateQueueLineItem(item.id, i, field, val)}
                        footer={null}
                        hideVenue
                        hideDisclaimer
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {currentScanIndex === -1 && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <Btn variant="ghost" onClick={closeScanModal}>{t("common.cancel")}</Btn>
                <Btn
                  variant="green"
                  loading={savingExtracted}
                  disabled={!formVenueId || batchDoneCount === 0 || savingExtracted}
                  onClick={saveAllExtracted}
                >
                  Save All ({batchDoneCount})
                </Btn>
              </div>
            )}
          </div>
        ) : extracted ? (
          <div>
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>✓ {t("invoices.extracted")}</div>
            <InvoiceScanReviewPanel
              t={t}
              isMobile={isMobile}
              venues={venues}
              formVenueId={formVenueId}
              onVenueChange={setFormVenueId}
              extracted={extracted}
              editItems={editItems}
              onExtractedChange={setExtracted}
              onLineItemChange={updateLineItem}
              footer={(
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
                  <Btn variant="ghost" onClick={() => { setExtracted(null); setEditItems([]); openScanPicker(); }}>{t("invoices.rescan")}</Btn>
                  <Btn variant="green" loading={savingExtracted} disabled={!formVenueId || savingExtracted} onClick={saveExtracted}>{t("invoices.saveInvoice")}</Btn>
                </div>
              )}
            />
          </div>
        ) : (
          <>
            {scanError && (
              <div style={{
                background: "#F0406022",
                border: "1px solid #F0406044",
                borderRadius: 9,
                padding: "10px 14px",
                color: "#F04060",
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}>
                <span>⚠</span>
                <span>{scanError}</span>
              </div>
            )}
            {scanError && (
              <button
                type="button"
                onClick={() => { closeScanModal(); setScanError(""); openManualModal(); }}
                style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 16, padding: 0, textDecoration: "underline" }}
              >
                Try manual entry instead
              </button>
            )}
            <ScanFirstTimeTip />
            {!multiScanEnabled && setPage && (
              <button
                type="button"
                onClick={() => setUpgradePrompt("multiScan")}
                style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 12, marginBottom: 12, padding: 0, textDecoration: "underline" }}
              >
                Scan multiple invoices at once on Growth and Pro →
              </button>
            )}
            <UploadZone onFile={scanInvoice} loading={scanLoading} label={multiScanEnabled ? "Drop invoice photos or click to upload (multiple allowed)" : t("invoices.uploadInvoice")} />
          </>
        )}
      </Modal>

      {/* MANUAL ENTRY MODAL */}
      <Modal open={showManual} onClose={closeManualModal} title={t("invoices.manualEntry")}>
        <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="invoices.selectVenueToSave" />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          {suppliersForInvoice.length > 0 && (
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>{t("invoices.supplier")}</div>
              <select value={selectedSupplierId} onChange={e => handleSupplierSelect(e.target.value)}
                style={{ width: "100%", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" }}>
                <option value="">— {t("suppliers.addSupplier").replace("+ ", "")} —</option>
                {suppliersForInvoice.map(s => <option key={s.id} value={s.id}>{s.name}{s.nif ? ` · ${s.nif}` : ""}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("invoices.supplierName") + " *"} value={manualForm.supplier} onChange={v => setManualForm(p => ({ ...p, supplier: v }))} placeholder={t("invoices.supplierName")} /></div>
          <Input label={t("invoices.invoiceNumber")} value={manualForm.invoiceNumber} onChange={v => setManualForm(p => ({ ...p, invoiceNumber: v }))} placeholder="INV-001" />
          <DateInput label={t("invoices.date")} value={manualForm.date} onChange={v => setManualForm(p => ({ ...p, date: v }))} />
          <DateInput label={t("invoices.dueDate")} value={manualForm.dueDate} onChange={v => setManualForm(p => ({ ...p, dueDate: v }))} />
          <Input label={t("invoices.nif")} value={manualForm.nif} onChange={v => setManualForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label={t("invoices.iban")} value={manualForm.iban} onChange={v => setManualForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000…" />
          <Input label={t("invoices.net") + " (€)"} type="number" value={manualForm.subtotal} onChange={v => setManualForm(p => ({ ...p, subtotal: v }))} prefix="€" />
          <Input label={t("invoices.tax") + " (€)"} type="number" value={manualForm.tax} onChange={v => setManualForm(p => ({ ...p, tax: v }))} prefix="€" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("invoices.total") + " (€)"} type="number" value={manualForm.total} onChange={v => setManualForm(p => ({ ...p, total: v }))} prefix="€" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={closeManualModal}>{t("common.cancel")}</Btn>
          <Btn loading={savingManual} disabled={!formVenueId || !manualForm.supplier.trim() || savingManual} onClick={saveManual}>{t("invoices.saveInvoice")}</Btn>
        </div>
      </Modal>

      {/* EDIT INVOICE MODAL */}
      {editForm && (
        <Modal open={!!editInvoice} onClose={() => { setEditInvoice(null); setEditForm(null); }} title={t("common.edit")}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("invoices.supplierName")} value={editForm.supplier} onChange={v => setEditForm(p => ({ ...p, supplier: v }))} /></div>
            <Input label={t("invoices.invoiceNumber")} value={editForm.invoiceNumber} onChange={v => setEditForm(p => ({ ...p, invoiceNumber: v }))} placeholder="INV-001" />
            <DateInput label={t("invoices.date")} value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
            <DateInput label={t("invoices.dueDate")} value={editForm.dueDate} onChange={v => setEditForm(p => ({ ...p, dueDate: v }))} />
            <Input label={t("invoices.nif")} value={editForm.nif} onChange={v => setEditForm(p => ({ ...p, nif: v }))} />
            <Input label={t("invoices.iban")} value={editForm.iban} onChange={v => setEditForm(p => ({ ...p, iban: v }))} />
            <Input label={t("invoices.net") + " (€)"} type="number" value={editForm.subtotal} onChange={v => setEditForm(p => ({ ...p, subtotal: v }))} prefix="€" />
            <Input label={t("invoices.tax") + " (€)"} type="number" value={editForm.tax} onChange={v => setEditForm(p => ({ ...p, tax: v }))} prefix="€" />
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("invoices.total") + " (€)"} type="number" value={editForm.total} onChange={v => setEditForm(p => ({ ...p, total: v }))} prefix="€" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => { setEditInvoice(null); setEditForm(null); }}>{t("common.cancel")}</Btn>
            <Btn loading={savingEdit} disabled={savingEdit} onClick={saveEdit}>{t("common.save")}</Btn>
          </div>
        </Modal>
      )}

      {/* LIST — 2-col on wide screens */}
      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {visible.length === 0
            ? <EmptyState icon="🧾" title={statusFilter === "all" ? t("invoices.noInvoices") : (statusFilter === "pending" ? t("invoices.filterPending") : t("invoices.filterPaid"))} sub={statusFilter === "all" ? t("invoices.noInvoicesSub") : undefined} action={statusFilter === "all" ? <Btn onClick={openScanPicker}>{t("invoices.scanFirst")}</Btn> : undefined} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {supplierGroups.map(g => (
                  <SupplierInvoiceGroup key={g.name} name={g.name} invs={g.invs} onMarkPaid={handleMarkPaid} onEdit={openEdit} payingId={payingId} isMobile={isMobile} />
                ))}
              </div>
            )}
        </div>
        {isWide && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <Card style={{ position: "sticky", top: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8, marginBottom: 16 }}>Summary</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>{t("invoices.totalSpend")}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{fmtEur(sumTotal)}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{byVenue.length} {t("invoices.invoices")}</div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>{t("invoices.pending")}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.amber }}>{fmtEur(sumPending)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>{t("invoices.paid")}</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.green }}>{fmtEur(sumPaid)}</div>
                </div>
              </div>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12 }}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>Unique Suppliers</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: C.accent }}>{supplierCount}</div>
              </div>
            </Card>
          </div>
        )}
      </div>
      <Toast message={toast} />
      <UpgradePrompt
        open={!!upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        feature={upgradePrompt}
        setPage={setPage}
      />
    </div>
  );
}

// ─── EXPENSES PAGE ───────────────────────────────────────────────────────────
function ExpensesPage({ expenses, addExpense, updateExpense, deleteExpense, venue, venues, onVenueChange }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
  const [filter, setFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formVenueId, setFormVenueId] = useState("");

  const emptyForm = () => ({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
  const closeModal = () => { setShowAdd(false); setEditId(null); setError(""); setFormVenueId(""); setForm(emptyForm()); };

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormVenueId(venue?.id || "");
    setShowAdd(true);
  };

  const filtered = (venue ? expenses.filter(e => e.venue_id === venue.id) : expenses).filter(e => filter === "ALL" || e.type === filter);

  const types = ["SERVICES", "WAGES", "RENT", "OTHER"];
  const typeColors = { SERVICES: C.blue, WAGES: C.amber, RENT: C.red, OTHER: C.textSub };

  const save = async () => {
    if (!form.name.trim()) return;
    setError("");
    setSaving(true);
    if (editId) {
      await updateExpense(editId, { venue_id: venue?.id || null, ...form });
    } else {
      const effectiveVenueId = formVenueId || venue?.id || "";
      if (!effectiveVenueId) {
        setSaving(false);
        return;
      }
      await addExpense({ venue_id: effectiveVenueId, ...form });
    }
    setSaving(false);
    closeModal();
  };

  const edit = (e) => {
    setForm({
      name: e.name || "",
      amount: e.amount?.toString() || "",
      type: e.type || "OTHER",
      recurring: e.recurring || "ONE_TIME",
      date: e.date || today(),
    });
    setEditId(e.id);
    setFormVenueId(e.venue_id || venue?.id || "");
    setShowAdd(true);
  };

  const allExpenses = venue ? expenses.filter(e => e.venue_id === venue.id) : expenses;
  const total = filtered.reduce((a, e) => a + (e.amount || 0), 0);
  const typeBreakdown = types.map(t => ({
    type: t, color: typeColors[t] || C.textSub,
    total: allExpenses.filter(e => e.type === t).reduce((a, e) => a + (e.amount || 0), 0),
  })).filter(t => t.total > 0).sort((a, b) => b.total - a.total);
  const maxTypeTotal = Math.max(...typeBreakdown.map(t => t.total), 1);
  const grandTotal = allExpenses.reduce((a, e) => a + (e.amount || 0), 0);

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      <PageHeader
        title={t("expenses.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={isWide}
        actions={<Btn onClick={openAddModal}>{t("expenses.addExpense")}</Btn>}
      />

      <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: isMobile ? 16 : 20 }}>
        {["ALL", ...types].map(typeKey => (
          <button key={typeKey} onClick={() => setFilter(typeKey)}
            style={{ padding: "5px 13px", borderRadius: 99, border: `1px solid ${filter === typeKey ? (typeColors[typeKey] || C.accent) : C.border}`, background: filter === typeKey ? (typeColors[typeKey] + "22" || C.accentDim) : "transparent", color: filter === typeKey ? (typeColors[typeKey] || C.accent) : C.textSub, fontSize: 12, cursor: "pointer", fontWeight: filter === typeKey ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
            {typeKey === "ALL" ? t("invoices.filterAll") : typeKey}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, color: C.text, display: "flex", alignItems: "center", flexShrink: 0 }}>{t("expenses.total")}: <strong style={{ marginLeft: 6, color: C.red }}>{fmtEur(total)}</strong></div>
      </div>

      <Modal open={showAdd} onClose={closeModal} title={editId ? t("common.edit") : t("expenses.addExpense")}>
        {!editId && (
          <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="expenses.selectVenueToSave" />
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("expenses.name")} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Electricity bill" /></div>
          <Input label={t("expenses.amount")} type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} prefix="€" />
          <DateInput label={t("expenses.date")} value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
          <Select label={t("expenses.type")} value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={types.map(typeKey => ({ value: typeKey, label: typeKey }))} />
          <Select label={t("expenses.recurring")} value={form.recurring} onChange={v => setForm(p => ({ ...p, recurring: v }))}
            options={[{ value: "ONE_TIME", label: t("expenses.oneTime") }, { value: "WEEKLY", label: t("expenses.weekly") }, { value: "MONTHLY", label: t("expenses.monthly") }, { value: "ANNUALLY", label: t("expenses.annually") }]} />
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={closeModal}>{t("common.cancel")}</Btn>
          <Btn loading={saving} disabled={saving || (!editId && !formVenueId) || !form.name.trim()} onClick={save}>{editId ? t("common.save") : t("expenses.addExpense")}</Btn>
        </div>
      </Modal>

      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0
            ? <EmptyState icon="💸" title={t("expenses.noExpenses")} sub={t("expenses.noExpensesSub")} action={<Btn onClick={openAddModal}>{t("expenses.addFirst")}</Btn>} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                  <Card key={e.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{e.date} · <Badge color={typeColors[e.type] || C.textSub}>{e.type}</Badge> · {e.recurring}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>{fmtEur(e.amount)}</div>
                        <button onClick={() => edit(e)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "5px 10px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏ {t("common.edit")}</button>
                        <button onClick={() => deleteExpense(e.id)} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>🗑</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
        </div>
        {isWide && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <Card style={{ position: "sticky", top: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8, marginBottom: 16 }}>By Category</div>
              {typeBreakdown.length === 0 ? (
                <div style={{ fontSize: 12, color: C.textMuted }}>No data yet</div>
              ) : typeBreakdown.map(({ type, total: tTotal, color }) => (
                <div key={type} style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12, color: C.textSub }}>{type}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color }}>{fmtEur(tTotal)}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: C.surfaceL, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(tTotal / maxTypeTotal) * 100}%`, background: color, borderRadius: 3, transition: "width .4s ease" }} />
                  </div>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 12, marginTop: 4 }}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>Total (all time)</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{fmtEur(grandTotal)}</div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SUPPLIERS PAGE ──────────────────────────────────────────────────────────
function SuppliersPage({ suppliers, addSupplier, updateSupplier, deleteSupplier, venue, venues, onVenueChange }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [formVenueId, setFormVenueId] = useState("");

  const emptyForm = () => ({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });
  const closeModal = () => { setShowAdd(false); setEditId(null); setForm(emptyForm()); setFormVenueId(""); };

  const openAddModal = () => {
    setEditId(null);
    setForm(emptyForm());
    setFormVenueId(venue?.id || "");
    setShowAdd(true);
  };

  const venueSuppliers = filterByVenue(suppliers, venue);
  const filtered = venueSuppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nif?.includes(search) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name.trim()) return;
    const effectiveVenueId = editId ? suppliers.find(s => s.id === editId)?.venue_id : (formVenueId || venue?.id || "");
    if (!editId && !effectiveVenueId) return;
    setSaving(true);
    if (editId) {
      await updateSupplier(editId, form);
    } else {
      await addSupplier({ ...form, venue_id: effectiveVenueId });
    }
    setSaving(false);
    closeModal();
  };

  const edit = (s) => {
    setForm({
      name: s.name || "",
      nif: s.nif || "",
      iban: s.iban || "",
      address: s.address || "",
      phone: s.phone || "",
      email: s.email || "",
      category: s.category || "",
    });
    setEditId(s.id);
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("suppliers.confirmDelete"))) return;
    setDeletingId(id);
    await deleteSupplier(id);
    if (expandedId === id) setExpandedId(null);
    setDeletingId(null);
  };

  const rowGrid = "minmax(0, 1fr) auto minmax(0, 1fr)";

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      <PageHeader
        title={t("suppliers.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={false}
        actions={<Btn onClick={openAddModal}>{t("suppliers.addSupplier")}</Btn>}
      />

      <div style={{ marginBottom: 18 }}>
        <Input value={search} onChange={setSearch} placeholder={t("common.search") + "…"} prefix="🔍" />
      </div>

      <Modal open={showAdd} onClose={closeModal} title={editId ? t("common.edit") : t("suppliers.addSupplier")}>
        {!editId && (
          <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="suppliers.selectVenueToSave" />
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("suppliers.name") + " *"} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Empresa Lda." /></div>
          <Input label={t("invoices.nif")} value={form.nif} onChange={v => setForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label={t("suppliers.category")} value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Vegetables…" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("invoices.iban")} value={form.iban} onChange={v => setForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000 0000 0000 0000 0000 0" /></div>
          <Input label={t("suppliers.phone")} value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 912 345 678" />
          <Input label={t("suppliers.email")} type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="contact@supplier.pt" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("suppliers.address")} value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua…" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={closeModal}>{t("common.cancel")}</Btn>
          <Btn loading={saving} disabled={saving || (!editId && !formVenueId && !venue) || !form.name.trim()} onClick={save}>{editId ? t("common.save") : t("suppliers.addSupplier")}</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🏭" title={t("suppliers.noSuppliers")} sub={t("suppliers.noSuppliersSub")} action={<Btn onClick={openAddModal}>{t("suppliers.addSupplier")}</Btn>} />
        : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: rowGrid, alignItems: "center", gap: 8, padding: "10px 16px", background: C.surfaceL, borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{t("invoices.supplier")}</span>
              <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textAlign: "center", justifySelf: "center" }}>{t("suppliers.category")}</span>
              <span />
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((s, idx) => {
              const isOpen = expandedId === s.id;
              const hasDetails = s.nif || s.iban || s.phone || s.email || s.address;
              return (
                <div key={s.id} style={{ borderBottom: idx < filtered.length - 1 ? `1px solid ${C.border}` : "none" }}>
                  {/* ── COLLAPSED ROW ── */}
                  <div onClick={() => setExpandedId(id => id === s.id ? null : s.id)}
                    style={{ display: "grid", gridTemplateColumns: rowGrid, alignItems: "center", padding: "12px 16px", cursor: "pointer", userSelect: "none", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{s.name}</span>
                    <div style={{ display: "flex", justifyContent: "center", justifySelf: "center", minWidth: isMobile ? 88 : 120 }}>
                      {s.category
                        ? <Badge color={C.accent}>{s.category}</Badge>
                        : <span style={{ fontSize: 12, color: C.textMuted }}>—</span>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                    <button
                      onClick={ev => { ev.stopPropagation(); edit(s); }}
                      style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    >✏ {t("common.edit")}</button>
                    <button
                      onClick={ev => { ev.stopPropagation(); handleDelete(s.id); }}
                      disabled={deletingId === s.id}
                      style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: deletingId === s.id ? 0.4 : 1 }}
                    >✕</button>
                    <span style={{ fontSize: 11, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
                    </div>
                  </div>

                  {/* ── EXPANDED DETAIL ── */}
                  {isOpen && hasDetails && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                      {s.nif && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>{t("invoices.nif")}</span>
                          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{s.nif}</span>
                        </div>
                      )}
                      {s.iban && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>{t("invoices.iban")}</span>
                          <span style={{ fontSize: 12, color: C.text, fontFamily: "monospace", wordBreak: "break-all" }}>{s.iban}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>{t("suppliers.phone")}</span>
                          <span style={{ fontSize: 13, color: C.text }}>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>{t("suppliers.email")}</span>
                          <span style={{ fontSize: 13, color: C.text }}>{s.email}</span>
                        </div>
                      )}
                      {s.address && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>{t("suppliers.address")}</span>
                          <span style={{ fontSize: 13, color: C.text }}>{s.address}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {isOpen && !hasDetails && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 16px" }}>
                      <span style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No additional info recorded.</span>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </Card>
        )}
    </div>
  );
}

// ─── STOCK PAGE ──────────────────────────────────────────────────────────────
function StockPage({ stockItems, addStockItem, updateStockItem, deleteStockItem, venue, venues, onVenueChange }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [exportMsg, setExportMsg] = useState("");
  const [formVenueId, setFormVenueId] = useState("");

  const venueStockItems = filterByVenue(stockItems, venue);
  const filtered = venueStockItems.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));

  const openAddModal = () => {
    setEditId(null);
    setForm({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" });
    setFormVenueId(venue?.id || "");
    setShowAdd(true);
  };

  const closeModal = () => {
    setShowAdd(false);
    setEditId(null);
    setFormVenueId("");
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const effectiveVenueId = editId ? stockItems.find(i => i.id === editId)?.venue_id : (formVenueId || venue?.id || "");
    if (!editId && !effectiveVenueId) return;
    setSaving(true);
    if (editId) {
      await updateStockItem(editId, form);
      setEditId(null);
    } else {
      await addStockItem({ ...form, venue_id: effectiveVenueId });
    }
    setSaving(false);
    setShowAdd(false);
    setFormVenueId("");
    setForm({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" });
  };

  const edit = (ing) => {
    setForm({ name: ing.name, unit: ing.unit, last_price: ing.last_price?.toString() || "", category: ing.category || "General", supplier: ing.supplier || "" });
    setEditId(ing.id);
    setShowAdd(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("stock.confirmDelete"))) return;
    setDeletingId(id);
    await deleteStockItem(id);
    setDeletingId(null);
  };

  const exportCSV = () => {
    const rows = [["Name", "Unit", "Last Price (€)", "Category", "Supplier", "Last Update"]];
    venueStockItems.forEach(i => rows.push([i.name, i.unit, i.last_price, i.category, i.supplier, i.last_update]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "stock.csv"; a.click();
    setExportMsg("Exported ✓");
    setTimeout(() => setExportMsg(""), 2000);
  };

  const mobileHeaders = ["Item", "Unit", "Price", ""];
  const desktopHeaders = ["Item", "Category", "Unit", "Last Price", "Supplier", "Last Update", ""];

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      <PageHeader
        title={t("stock.title")}
        venue={venue}
        venues={venues}
        onVenueChange={onVenueChange}
        isMobile={isMobile}
        isTablet={w >= 768 && w < 1024}
        isWide={false}
        actions={(
          <>
            {exportMsg && <span style={{ fontSize: 12, color: C.green }}>{exportMsg}</span>}
            {!isMobile && <Btn variant="ghost" onClick={exportCSV}>📤 {t("common.export")} CSV</Btn>}
            <Btn onClick={openAddModal}>{t("stock.add")}</Btn>
          </>
        )}
      />

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}><Input value={search} onChange={setSearch} placeholder={t("common.search") + "…"} prefix="🔍" /></div>
        <div style={{ fontSize: 13, color: C.textSub, whiteSpace: "nowrap" }}>{filtered.length} {t("stock.items")}</div>
      </div>

      <Modal open={showAdd} onClose={closeModal} title={editId ? t("stock.edit") : t("stock.add")}>
        {!editId && (
          <VenueFormFields venues={venues} value={formVenueId} onChange={setFormVenueId} messageKey="stock.selectVenueToSave" />
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label={t("stock.name")} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Chicken breast, printer paper, shampoo…" /></div>
          <Input label={t("stock.unit")} value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))} placeholder="kg, L, un, g…" />
          <Input label={t("stock.price")} type="number" value={form.last_price} onChange={v => setForm(p => ({ ...p, last_price: v }))} prefix="€" />
          <Input label={t("stock.category")} value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Dairy, Produce…" />
          <Input label={t("stock.supplier")} value={form.supplier} onChange={v => setForm(p => ({ ...p, supplier: v }))} placeholder={t("invoices.supplierName")} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={closeModal}>{t("common.cancel")}</Btn>
          <Btn loading={saving} disabled={saving || (!editId && !formVenueId && !venue) || !form.name.trim()} onClick={save}>{editId ? t("common.save") : t("stock.add")}</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="📦" title={t("stock.noItems")} sub={t("stock.noItemsSub")} action={<Btn onClick={openAddModal}>{t("stock.add")}</Btn>} />
        : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div className="scroll-x">
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.surfaceL }}>
                    {(isMobile ? mobileHeaders : desktopHeaders).map(h => (
                      <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMuted, fontWeight: 500, fontSize: 11, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(ing => (
                    <tr key={ing.id} style={{ borderBottom: `1px solid ${C.border}` }}
                      onMouseEnter={e => e.currentTarget.style.background = C.surfaceL}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "10px 14px", color: C.text, fontWeight: 500, whiteSpace: "nowrap" }}>{ing.name}</td>
                      {!isMobile && <td style={{ padding: "10px 14px" }}><Badge color={C.accent}>{ing.category}</Badge></td>}
                      <td style={{ padding: "10px 14px", color: C.textSub }}>{ing.unit}</td>
                      <td style={{ padding: "10px 14px", color: C.amber, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtEur(ing.last_price || 0)}</td>
                      {!isMobile && <td style={{ padding: "10px 14px", color: C.textSub, fontSize: 12 }}>{ing.supplier || "—"}</td>}
                      {!isMobile && <td style={{ padding: "10px 14px", color: C.textMuted, fontSize: 12 }}>{ing.last_update || "—"}</td>}
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "nowrap" }}>
                          <button onClick={() => edit(ing)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>✏ {t("common.edit")}</button>
                          <button onClick={() => handleDelete(ing.id)} disabled={deletingId === ing.id} style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600, opacity: deletingId === ing.id ? 0.4 : 1 }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
    </div>
  );
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────────
// ─── VENUE GATE ──────────────────────────────────────────────────────────────
function VenueGate({ onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: "", type: "Other", address: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name.trim()) return setError("Venue name is required.");
    setError("");
    setSaving(true);
    await onCreated(form);
    setSaving(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <Logo size={40} />
          </div>
          <h1 style={{ color: C.text, margin: "0 0 10px", fontSize: 22, fontWeight: 600 }}>{t("common.noVenueGate")}</h1>
          <p style={{ color: C.textSub, margin: 0, fontSize: 15, lineHeight: 1.6 }}>
            {t("settings.noVenuesSub")}
          </p>
        </div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 18, textTransform: "uppercase", letterSpacing: ".6px" }}>{t("settings.addFirst")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label={t("settings.venueName") + " *"} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="My Business" />
            <Select
              label={t("settings.venueType")}
              value={form.type}
              onChange={v => setForm(p => ({ ...p, type: v }))}
              options={VENUE_TYPE_OPTIONS.map(vt => ({ value: vt, label: vt }))}
            />
            <Input label={t("suppliers.address")} value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua… (optional)" />
            <Input label={t("suppliers.phone")} value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 … (optional)" />
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>⚠ {error}</div>}
          <Btn
            onClick={submit}
            loading={saving}
            style={{ width: "100%", justifyContent: "center", marginTop: 22 }}
            size="lg"
          >
            {t("settings.addVenue")}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ───────────────────────────────────────────────────────────
function SettingsPage({ venues, addVenue, deleteVenue, user, subscription, setPage }) {
  const { t } = useTranslation();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [showAdd, setShowAdd] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Other", address: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // venue delete confirmation state
  const [pendingDelete, setPendingDelete] = useState(null); // venue object | null
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [supportForm, setSupportForm] = useState({ subject: "Bug Report", message: "" });
  const [supportSaving, setSupportSaving] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState(false);
  const [supportError, setSupportError] = useState("");

  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  const [consent, setConsentState] = useState(() => readCookieConsent() || {});

  useEffect(() => {
    const syncConsent = (e) => setConsentState(e.detail || readCookieConsent() || {});
    window.addEventListener("cookieConsentUpdated", syncConsent);
    return () => window.removeEventListener("cookieConsentUpdated", syncConsent);
  }, []);

  const updateAnalyticsConsent = (allowed) => {
    const updated = { essential: true, analytics: allowed, timestamp: new Date().toISOString() };
    localStorage.setItem("cookie_consent", JSON.stringify(updated));
    setConsentState(updated);
    window.dispatchEvent(new CustomEvent("cookieConsentUpdated", { detail: updated }));
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    setPortalError("");
    try {
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error || "Could not open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setPortalError("Connection error. Please try again.");
      setPortalLoading(false);
    }
  };

  const sendSupport = async () => {
    if (!supportForm.message.trim()) return;
    setSupportSaving(true);
    setSupportError("");
    setSupportSuccess(false);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: user?.user_metadata?.name || user?.email,
          email: user?.email,
          subject: supportForm.subject,
          message: supportForm.message,
          source: "Settings Support Form",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSupportSuccess(true);
      setSupportForm({ subject: "Bug Report", message: "" });
    } catch {
      setSupportError(t("settings.supportError"));
    } finally {
      setSupportSaving(false);
    }
  };

  // account deletion state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState("");

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteAccountError("");
    try {
      // Delete all venues — CASCADE handles sales, invoices, expenses automatically
      for (const v of venues) {
        await supabase.from("venues").delete().eq("id", v.id);
      }
      // Delete suppliers and stock items without venue (legacy rows)
      await supabase.from("suppliers").delete().eq("user_id", user.id);
      await supabase.from("stock_items").delete().eq("user_id", user.id);
      await supabase.from("staff").delete().eq("user_id", user.id);
      await supabase.from("subscriptions").delete().eq("user_id", user.id);
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fully delete account.");
      }
      await supabase.auth.signOut();
    } catch (e) {
      setDeletingAccount(false);
      setDeleteAccountError(e.message || "Deletion failed. Please try again.");
    }
  };

  const venueLimit = subscription?.venue_limit ?? 1;
  const { isFree: isFreeTier, isTrial, plan, trialDaysLeft } = useSubscriptionGate(subscription);
  const tier = subscription?.tier ?? "free";
  const tierStyle = getTierBadgeStyle(tier);
  const scansUsed = subscription?.scans_used_this_month ?? 0;
  const scanLimit = subscription?.scan_limit ?? plan.scanLimit ?? 0;
  const scanLimitDisplay = formatScanLimit(scanLimit);
  const scanBarWidth = scanLimit === 999999
    ? "15%"
    : scanLimit > 0
      ? `${Math.min((scansUsed / scanLimit) * 100, 100)}%`
      : "0%";
  const isActiveStatus = subscription?.status === "active" || subscription?.status === "trialing";
  const daysLeft = trialDaysLeft();

  const handleAddVenueClick = () => {
    if (venues.length >= venueLimit) {
      setShowLimitModal(true);
    } else {
      setShowAdd(true);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await addVenue(form);
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", type: "Other", address: "", phone: "" });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError("");
    const { error } = await deleteVenue(pendingDelete.id);
    setDeleting(false);
    if (error) {
      setDeleteError(error.message || "Deletion failed. Please try again.");
    } else {
      setPendingDelete(null);
    }
  };

  return (
    <div style={{ padding: isMobile ? 16 : "28px 32px", maxWidth: 700 }}>
      <h1 style={{ margin: isMobile ? "0 0 20px" : "0 0 28px", fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, false), color: C.text }}>{t("settings.title")}</h1>
      <TrialBanner subscription={subscription} onPricing={() => setPage("pricing")} />
      <LockedVenuesBanner venuesWithLockStatus={venues} onUpgrade={() => setPage("pricing")} />

      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>
              Install ApexManager
            </div>
            <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>
              Add to your home screen for quick access, like a native app
            </div>
          </div>
          <InstallAppButton />
        </div>
      </Card>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>{t("settings.account")}</h2>
        <Card>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, background: C.accentDim, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{user?.user_metadata?.name}</div>
              <div style={{ fontSize: 13, color: C.textSub }}>{user?.email}</div>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>{t("settings.language")}</h2>
        <Card style={{ padding: 16 }}>
          <LanguageSwitcher />
        </Card>
      </div>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>{t("settings.subscription")}</h2>
        <Card style={{ background: tierStyle.background, border: tierStyle.border, position: "relative", overflow: "hidden" }}>
          <div style={{
            position: "absolute",
            top: -40,
            right: -40,
            width: 120,
            height: 120,
            background: tierStyle.color,
            opacity: 0.06,
            borderRadius: "50%",
            pointerEvents: "none",
          }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, position: "relative" }}>
            <div>
              <div style={{ fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "1px", marginBottom: 6 }}>{t("settings.currentPlan")}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{tierStyle.icon}</span>
                <span style={{ fontSize: 24, fontWeight: 800, color: tierStyle.color, letterSpacing: "-0.3px" }}>{tierStyle.label}</span>
              </div>
            </div>
            <div style={{
              padding: "4px 12px",
              borderRadius: 99,
              background: isActiveStatus ? "#22C97A22" : isFreeTier ? "#8A8A9A22" : "#F5A62322",
              color: isActiveStatus ? "#22C97A" : isFreeTier ? "#8A8A9A" : "#F5A623",
              fontSize: 11,
              fontWeight: 700,
              border: isActiveStatus ? "1px solid #22C97A44" : isFreeTier ? "1px solid #3A3A4844" : "1px solid #F5A62344",
              letterSpacing: ".3px",
              textTransform: "uppercase",
              flexShrink: 0,
            }}>
              {isActiveStatus ? "● Active" : isFreeTier ? t("common.freePlan") : (subscription?.status || "—")}
            </div>
          </div>

          {!isFreeTier && subscription?.current_period_end && (
            <div style={{
              fontSize: 12,
              color: C.textSub,
              marginBottom: 16,
              padding: "10px 12px",
              background: "rgba(255,255,255,0.03)",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
              position: "relative",
            }}>
              <span>Renews</span>
              <span style={{ color: C.text, fontWeight: 500 }}>
                {new Date(subscription.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          )}

          {isFreeTier && (
            <p style={{ margin: "0 0 16px", fontSize: 13, color: C.textSub, lineHeight: 1.65, position: "relative" }}>
              You are on the free plan — 7 days of data, manual entry only, 1 venue.
            </p>
          )}

          {isTrial && daysLeft != null && (
            <p style={{ margin: "0 0 16px", fontSize: 13, color: tierStyle.color, lineHeight: 1.65, position: "relative" }}>
              {daysLeft === 0 ? "Your free trial ends today." : `${daysLeft} day${daysLeft === 1 ? "" : "s"} left in your free trial.`}
            </p>
          )}

          {!isFreeTier && (
            <div style={{ marginBottom: 16, position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textSub, marginBottom: 6 }}>
                <span>{t("common.scanLimit")}</span>
                <span style={{ color: tierStyle.color, fontWeight: 600 }}>{scansUsed}/{scanLimitDisplay}</span>
              </div>
              <div style={{ height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  height: "100%",
                  borderRadius: 99,
                  background: tierStyle.color,
                  width: scanBarWidth,
                  boxShadow: `0 0 8px ${tierStyle.color}66`,
                  transition: "width 0.4s ease",
                }} />
              </div>
            </div>
          )}

          {(isFreeTier || isTrial) ? (
            <SidebarUpgradeButton embedded onClick={() => setPage("pricing")} />
          ) : (
            <>
              <Btn variant="ghost" onClick={handleManageSubscription} loading={portalLoading}>
                {t("settings.manageBilling")}
              </Btn>
              {portalError && (
                <div style={{ color: C.red, fontSize: 12, marginTop: 8 }}>⚠ {portalError}</div>
              )}
              <p style={{ margin: "12px 0 0", fontSize: 11, color: C.textMuted, lineHeight: 1.55 }}>
                Update payment method, download invoices, change or cancel your plan — powered by Stripe
              </p>
            </>
          )}
        </Card>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 600 }}>{t("settings.venues")}</h2>
          <Btn onClick={handleAddVenueClick} size="sm">{t("settings.addVenue")}</Btn>
        </div>
        {venues.length === 0
          ? <EmptyState icon="🏢" title={t("settings.noVenues")} sub={t("settings.noVenuesSub")} action={<Btn onClick={handleAddVenueClick}>{t("settings.addFirst")}</Btn>} />
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {venues.map(v => (
                <Card key={v.id} style={v.isLocked ? { borderLeft: "3px solid #F5A623" } : undefined}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{v.name}</div>
                        {v.isLocked && (
                          <span style={{ background: "#F5A62322", color: "#F5A623", padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600 }}>
                            🔒 {t("venueLock.readOnlyBadge")}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{v.type} {v.address ? `· ${v.address}` : ""}</div>
                    </div>
                    <button onClick={() => { setPendingDelete(v); setDeleteError(""); }} title={t("settings.deleteVenue")} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>🗑</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <Modal
        open={!!pendingDelete}
        onClose={() => { if (!deleting) { setPendingDelete(null); setDeleteError(""); } }}
        title={`Delete "${pendingDelete?.name}"?`}
      >
        <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.red, fontWeight: 600, marginBottom: 8 }}>
            ⚠ This will permanently delete this venue and ALL its data including:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.red, lineHeight: 2 }}>
            <li>All daily sales entries</li>
            <li>All invoices</li>
            <li>All fixed expenses</li>
          </ul>
          <div style={{ fontSize: 12, color: C.red, marginTop: 10, fontWeight: 700 }}>
            This cannot be undone.
          </div>
        </div>
        {deleteError && (
          <div style={{ fontSize: 13, color: C.red, marginBottom: 14 }}>⚠ {deleteError}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" onClick={() => { setPendingDelete(null); setDeleteError(""); }} disabled={deleting}>
            {t("common.cancel")}
          </Btn>
          <Btn
            variant="danger"
            style={{ background: C.red, color: "#fff", border: "none" }}
            onClick={confirmDelete}
            loading={deleting}
            disabled={deleting}
          >
            Delete Everything
          </Btn>
        </div>
      </Modal>

      <Modal open={showLimitModal} onClose={() => setShowLimitModal(false)} title="Venue Limit Reached">
        <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, marginBottom: 20 }}>
          You've reached the <strong style={{ color: C.text }}>{venueLimit} venue{venueLimit !== 1 ? "s" : ""}</strong> limit on your{" "}
          <span style={{ textTransform: "capitalize", color: C.accent, fontWeight: 600 }}>{tier}</span> plan.
          <br />Upgrade to add more venues.
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" onClick={() => setShowLimitModal(false)}>{t("common.close")}</Btn>
          <Btn onClick={() => { setShowLimitModal(false); setPage("pricing"); }}>{t("settings.upgradePlan")}</Btn>
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={t("settings.addVenue")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label={t("settings.venueName") + " *"} value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="My Business" />
          <Select label={t("settings.venueType")} value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))}
            options={VENUE_TYPE_OPTIONS.map(vt => ({ value: vt, label: vt }))} />
          <Input label={t("suppliers.address")} value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua…" />
          <Input label={t("suppliers.phone")} value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 …" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>{t("common.cancel")}</Btn>
          <Btn onClick={save} loading={saving}>{t("settings.addVenue")}</Btn>
        </div>
      </Modal>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>About</h2>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>ApexManager</strong> — {t("landing.footerTagline")}<br />
            AI-powered invoice scanning · Daily sales tracking · Cost analytics
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>Privacy & Cookies</h2>
        <Card>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>
            Privacy & Cookies
          </div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>
            Control which optional cookies we&apos;re allowed to use.{" "}
            <Link to="/cookies" style={{ color: C.accent, textDecoration: "none", fontWeight: 600 }}>Cookie Policy</Link>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Analytics cookies</div>
              <div style={{ fontSize: 11, color: C.textMuted }}>
                Helps us understand app usage to improve the product
              </div>
            </div>
            <ToggleSwitch
              checked={!!consent.analytics}
              onChange={updateAnalyticsConsent}
              ariaLabel="Analytics cookies"
            />
          </div>
        </Card>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>{t("settings.support")}</h2>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 4 }}>{t("settings.contactSupport")}</div>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 16 }}>{t("settings.supportSub")}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Select label={t("settings.subject")} value={supportForm.subject} onChange={v => setSupportForm(p => ({ ...p, subject: v }))}
              options={["Bug Report", "Feature Request", "Billing", "Other"].map(s => ({ value: s, label: s }))} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{t("settings.message")}</div>
              <textarea
                value={supportForm.message}
                onChange={e => setSupportForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Describe your issue or feedback…"
                rows={4}
                style={{ width: "100%", minHeight: 100, background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, color: C.text, fontFamily: "inherit", outline: "none", resize: "vertical", boxSizing: "border-box" }}
              />
            </div>
            {supportSuccess && <div style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>{t("settings.sent")}</div>}
            {supportError && <div style={{ fontSize: 13, color: C.red }}>{supportError}</div>}
            <div>
              <Btn onClick={sendSupport} loading={supportSaving} disabled={!supportForm.message.trim() || supportSaving}>{t("settings.send")}</Btn>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 15, color: C.red, margin: "0 0 14px", fontWeight: 600 }}>Danger Zone</h2>
        <div style={{ border: `1px solid ${C.red}44`, borderRadius: 12, padding: "20px 24px", background: C.redDim }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>{t("settings.deleteAccount")}</div>
              <div style={{ fontSize: 13, color: C.textSub, maxWidth: 380 }}>
                {t("settings.deleteAccountSub")}
              </div>
            </div>
            <Btn
              variant="danger"
              style={{ background: C.red, color: "#fff", border: "none", flexShrink: 0 }}
              onClick={() => { setShowDeleteAccount(true); setDeleteAccountError(""); }}
            >
              Request Account Deletion
            </Btn>
          </div>
        </div>
      </div>

      {/* ── Account deletion modal ────────────────────────────────────────── */}
      <Modal open={showDeleteAccount} onClose={() => { if (!deletingAccount) { setShowDeleteAccount(false); setDeleteAccountError(""); } }} title="Delete Your Account?">
        <div style={{ background: C.redDim, border: `1px solid ${C.red}44`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: C.red, fontWeight: 600, marginBottom: 8 }}>
            ⚠ This will permanently delete your account and ALL your data including:
          </div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.red, lineHeight: 2 }}>
            <li>All venues</li>
            <li>All daily sales entries</li>
            <li>All invoices</li>
            <li>All expenses</li>
            <li>All suppliers and stock items</li>
          </ul>
          <div style={{ fontSize: 12, color: C.red, marginTop: 10, fontWeight: 700 }}>
            This cannot be undone.
          </div>
        </div>
        {deleteAccountError && (
          <div style={{ fontSize: 13, color: C.red, marginBottom: 14 }}>⚠ {deleteAccountError}</div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" onClick={() => { setShowDeleteAccount(false); setDeleteAccountError(""); }} disabled={deletingAccount}>
            {t("common.cancel")}
          </Btn>
          <Btn
            style={{ background: C.red, color: "#fff", border: "none" }}
            onClick={handleDeleteAccount}
            loading={deletingAccount}
            disabled={deletingAccount}
          >
            Delete Everything
          </Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
function DeploymentConfigNotice() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ maxWidth: 520, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px" }}>
        <div style={{ marginBottom: 16 }}><Logo size={28} /></div>
        <h1 style={{ margin: "0 0 12px", fontSize: 20, fontWeight: 700 }}>Configuration required</h1>
        <p style={{ margin: "0 0 16px", fontSize: 14, color: C.textSub, lineHeight: 1.6 }}>
          The app works locally because your <code style={{ color: C.amber }}>.env</code> file is present, but Vercel does not upload that file. Add these environment variables in Vercel → Project → Settings → Environment Variables, then redeploy:
        </p>
        <ul style={{ margin: "0 0 16px", paddingLeft: 20, fontSize: 13, color: C.textSub, lineHeight: 1.9 }}>
          <li><code>VITE_SUPABASE_URL</code></li>
          <li><code>VITE_SUPABASE_ANON_KEY</code></li>
          <li><code>VITE_APP_URL</code> (your Vercel URL, e.g. https://your-app.vercel.app)</li>
          <li><code>VITE_STRIPE_PUBLISHABLE_KEY</code> + price IDs</li>
          <li><code>STRIPE_SECRET_KEY</code>, <code>SUPABASE_SERVICE_ROLE_KEY</code>, <code>ANTHROPIC_API_KEY</code> (server)</li>
        </ul>
        <p style={{ margin: 0, fontSize: 12, color: C.textMuted }}>See <code>.env.example</code> in the repo for the full list.</p>
      </div>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(supabaseConfigured);
  const [page, setPage] = useState("dashboard");
  const [invoicesInitialFilter, setInvoicesInitialFilter] = useState(null);
  const [venues, setVenues] = useState([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [venueId, setVenueId] = useState("");
  const [sales, setSales] = useState([]);
  const [salesLoading, setSalesLoading] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [stockItems, setStockItems] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [upgradePrompt, setUpgradePrompt] = useState(null);

  const venueLimit = subscription?.venue_limit ?? 1;

  const venuesWithLockStatus = useMemo(
    () => computeVenuesWithLockStatus(venues, venueLimit),
    [venues, venueLimit]
  );

  const guardVenueWrite = useCallback((targetVenueId) => {
    if (!targetVenueId) return null;
    const targetVenue = venuesWithLockStatus.find(v => v.id === targetVenueId);
    if (targetVenue?.isLocked) {
      setUpgradePrompt("venueLocked");
      return { error: { message: "This venue is locked. Upgrade to add more data." } };
    }
    return null;
  }, [venuesWithLockStatus]);

  useEffect(() => {
    const checkConsent = () => {
      const consent = readCookieConsent();
      if (!consent) return;
      if (consent.analytics === true) {
        loadGoogleAnalytics();
      } else if (consent.analytics === false) {
        unloadGoogleAnalytics();
      }
    };

    checkConsent();
    window.addEventListener("cookieConsentUpdated", checkConsent);
    return () => window.removeEventListener("cookieConsentUpdated", checkConsent);
  }, []);

  useEffect(() => {
    const path = user ? `/${page}` : location.pathname;
    trackPageview(path);
  }, [user, page, location.pathname]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    // purge stale data saved to localStorage before the Supabase migration
    ["apex_sales", "apex_invoices", "apex_expenses", "apex_venues"].forEach(k =>
      localStorage.removeItem(k)
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setVenues([]); return; }
    setVenuesLoading(true);
    supabase
      .from("venues")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at")
      .then(({ data }) => {
        setVenues(data || []);
        setVenuesLoading(false);
      });
  }, [user]);

  useEffect(() => {
    if (!user) { setInvoices([]); return; }
    supabase
      .from("invoices")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }) => setInvoices(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) { setExpenses([]); return; }
    supabase.from("expenses").select("*").eq("user_id", user.id).order("date", { ascending: false })
      .then(({ data }) => setExpenses(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) { setSuppliers([]); return; }
    supabase.from("suppliers").select("*").eq("user_id", user.id).order("name")
      .then(({ data }) => setSuppliers(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) { setStockItems([]); return; }
    supabase.from("stock_items").select("*").eq("user_id", user.id).order("name")
      .then(({ data }) => setStockItems(data || []));
  }, [user]);

  useEffect(() => {
    if (!user) { setStaff([]); return; }
    supabase.from("staff").select("*").eq("user_id", user.id).order("name")
      .then(async ({ data }) => {
        const loaded = data || [];
        const now = today();
        const expired = loaded.filter(m =>
          ["holidays", "sick_leave"].includes(m.status) &&
          m.status_until && m.status_until < now
        );
        if (expired.length > 0) {
          await Promise.all(expired.map(m =>
            supabase.from("staff").update({ status: "active", status_from: null, status_until: null }).eq("id", m.id)
          ));
          setStaff(loaded.map(m =>
            expired.find(e => e.id === m.id) ? { ...m, status: "active", status_from: null, status_until: null } : m
          ));
        } else {
          setStaff(loaded);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!user) { setSubscription(null); return; }
    supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) =>
        setSubscription(
          data ?? {
            user_id: user.id,
            tier: "free",
            scan_limit: 0,
            scans_used_this_month: 0,
            venue_limit: 1,
            status: "active",
          }
        )
      );
  }, [user]);

  useEffect(() => {
    if (!user) { setSales([]); return; }
    setSalesLoading(true);
    supabase
      .from("sales")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .then(({ data }) => {
        setSales(data || []);
        setSalesLoading(false);
      });
  }, [user]);

  // ── Sales helpers ─────────────────────────────────────────────────────────────
  const addSale = async ({ venue_id, date, cash, card, cash_expenses, xpto, pos, staff, note }) => {
    const blocked = guardVenueWrite(venue_id);
    if (blocked) return blocked;
    const { data, error } = await supabase
      .from("sales")
      .insert({ user_id: user.id, venue_id: venue_id || null, date, cash, card, cash_expenses, xpto, pos, staff, note })
      .select()
      .single();
    if (!error && data) setSales(prev => [data, ...prev]);
    return { data, error };
  };

  const deleteSale = async (id) => {
    await supabase.from("sales").delete().eq("id", id);
    setSales(prev => prev.filter(s => s.id !== id));
  };

  const updateSale = async (id, updates) => {
    const { data, error } = await supabase
      .from("sales")
      .update({
        date: updates.date,
        cash: updates.cash,
        card: updates.card,
        cash_expenses: updates.cash_expenses,
        xpto: updates.xpto,
        pos: updates.pos,
        staff: updates.staff,
        note: updates.note,
      })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setSales(prev => prev.map(s => s.id === id ? data : s));
    return { data, error };
  };

  // ── Expense helpers ──────────────────────────────────────────────────────────
  const addExpense = async ({ venue_id, name, amount, type, recurring, date }) => {
    const blocked = guardVenueWrite(venue_id);
    if (blocked) return blocked;
    const { data, error } = await supabase
      .from("expenses")
      .insert({ user_id: user.id, venue_id: venue_id || null, name, amount: parseFloat(amount) || 0, type, recurring, date })
      .select().single();
    if (!error && data) setExpenses(prev => [data, ...prev]);
  };

  const deleteExpense = async (id) => {
    await supabase.from("expenses").delete().eq("id", id);
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const updateExpense = async (id, { venue_id, name, amount, type, recurring, date }) => {
    const { data, error } = await supabase
      .from("expenses")
      .update({ venue_id: venue_id || null, name, amount: parseFloat(amount) || 0, type, recurring, date })
      .eq("id", id)
      .select().single();
    if (!error && data) setExpenses(prev => prev.map(e => e.id === id ? data : e));
    return { data, error };
  };

  // ── Supplier helpers ─────────────────────────────────────────────────────────
  const addSupplier = async ({ name, nif, iban, address, phone, email, category, venue_id }) => {
    const blocked = guardVenueWrite(venue_id);
    if (blocked) return null;
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ user_id: user.id, venue_id: venue_id || null, name, nif: nif || null, iban: iban || null, address: address || null, phone: phone || null, email: email || null, category: category || null })
      .select().single();
    if (!error && data) {
      setSuppliers(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const updateSupplier = async (id, { name, nif, iban, address, phone, email, category }) => {
    const { data, error } = await supabase
      .from("suppliers")
      .update({ name, nif: nif || null, iban: iban || null, address: address || null, phone: phone || null, email: email || null, category: category || null })
      .eq("id", id)
      .select().single();
    if (!error && data) {
      setSuppliers(prev => prev.map(s => s.id === id ? data : s));
      return data;
    }
    return null;
  };

  const deleteSupplier = async (id) => {
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (!error) setSuppliers(prev => prev.filter(s => s.id !== id));
  };

  // ── Stock item helpers ───────────────────────────────────────────────────────
  const addStockItem = async ({ name, unit, last_price, category, supplier, venue_id }) => {
    const blocked = guardVenueWrite(venue_id);
    if (blocked) return null;
    const price = parseFloat(last_price) || 0;
    const { data, error } = await supabase
      .from("stock_items")
      .insert({ user_id: user.id, venue_id: venue_id || null, name, unit, last_price: price, category: category || "General", supplier: supplier || null, last_update: today(), price_history: [{ date: today(), price }] })
      .select().single();
    if (!error && data) setStockItems(prev => [...prev, data]);
    return error ? null : data;
  };

  const updateStockItem = async (id, { name, unit, last_price, category, supplier }) => {
    const price = parseFloat(last_price) || 0;
    const existing = stockItems.find(i => i.id === id);
    const priceChanged = existing && parseFloat(existing.last_price) !== price;
    const payload = {
      name,
      unit,
      last_price: price,
      category,
      supplier: supplier || null,
    };
    if (priceChanged) {
      payload.last_update = today();
      payload.price_history = [...(existing?.price_history || []), { date: today(), price }];
    }
    const { data, error } = await supabase
      .from("stock_items")
      .update(payload)
      .eq("id", id).select().single();
    if (!error && data) setStockItems(prev => prev.map(i => i.id === id ? data : i));
  };

  const deleteStockItem = async (id) => {
    const { error } = await supabase.from("stock_items").delete().eq("id", id);
    if (!error) setStockItems(prev => prev.filter(i => i.id !== id));
  };

  const upsertStockItem = async ({ name, unit, last_price, supplier, venue_id }) => {
    const existing = stockItems.find(i =>
      i.name.toLowerCase() === name.toLowerCase() && (i.venue_id || null) === (venue_id || null)
    );
    if (existing) {
      await updateStockItem(existing.id, { name: existing.name, unit, last_price, category: existing.category || "General", supplier });
    } else {
      await addStockItem({ name, unit, last_price, category: "General", supplier, venue_id });
    }
  };

  // ── Staff helpers ────────────────────────────────────────────────────────────
  const addStaff = async (payload) => {
    const blocked = guardVenueWrite(payload.venue_id);
    if (blocked) return null;
    const { data, error } = await supabase
      .from("staff")
      .insert({ user_id: user.id, ...payload })
      .select().single();
    if (!error && data) setStaff(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return error ? null : data;
  };

  const updateStaff = async (id, payload) => {
    const { data, error } = await supabase
      .from("staff")
      .update(payload)
      .eq("id", id)
      .select().single();
    if (!error && data) setStaff(prev => prev.map(s => s.id === id ? data : s));
    return { data, error };
  };

  const deleteStaff = async (id) => {
    await supabase.from("staff").delete().eq("id", id);
    setStaff(prev => prev.filter(s => s.id !== id));
  };

  const addInvoice = async ({ venueId, supplierName, supplierNif, supplierIban, date, dueDate, invoiceNumber, items, subtotal, tax, total }) => {
    const blocked = guardVenueWrite(venueId);
    if (blocked) return blocked;
    const { data, error } = await supabase
      .from("invoices")
      .insert({
        user_id: user.id,
        venue_id: venueId || null,
        supplier_name: supplierName,
        supplier_nif: supplierNif || null,
        supplier_iban: supplierIban || null,
        date,
        due_date: dueDate || null,
        invoice_number: invoiceNumber || null,
        items: items || [],
        subtotal: subtotal || 0,
        tax: tax || 0,
        total: total || 0,
        status: "pending",
      })
      .select()
      .single();
    if (!error && data) {
      setInvoices(prev => [data, ...prev]);
      return data;
    }
    return null;
  };

  const markInvoicePaid = async (id) => {
    const { data, error } = await supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (!error && data) {
      setInvoices(prev => prev.map(inv => inv.id === id ? data : inv));
    }
  };

  const updateInvoice = async (id, updates) => {
    const { data, error } = await supabase
      .from("invoices")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (!error && data) setInvoices(prev => prev.map(inv => inv.id === id ? data : inv));
    return { data, error };
  };

  const addVenue = async ({ name, type, address, phone }) => {
    const { data, error } = await supabase
      .from("venues")
      .insert({ user_id: user.id, name, type, address, phone })
      .select()
      .single();
    if (!error && data) {
      setVenues(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  const deleteVenue = async (id) => {
    const { error } = await supabase.from("venues").delete().eq("id", id);
    if (error) return { error };
    setVenues(prev => prev.filter(v => v.id !== id));
    setSales(prev => prev.filter(s => s.venue_id !== id));
    setInvoices(prev => prev.filter(i => i.venue_id !== id));
    setExpenses(prev => prev.filter(e => e.venue_id !== id));
    setStaff(prev => prev.filter(s => s.venue_id !== id));
    setSuppliers(prev => prev.filter(s => s.venue_id !== id));
    setStockItems(prev => prev.filter(i => i.venue_id !== id));
    if (venueId === id) setVenueId("");
    return { error: null };
  };

  const venue = venuesWithLockStatus.find(v => v.id === venueId) || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleVenueChange = useCallback((id) => {
    setVenueId(id);
    if (id && supabase) {
      const ts = new Date().toISOString();
      supabase.from("venues").update({ last_used_at: ts }).eq("id", id).then(() => {});
      setVenues(prev => prev.map(v => (v.id === id ? { ...v, last_used_at: ts } : v)));
    }
  }, []);

  const w = useWindowWidth();
  const isMobile = w < 1024;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const globalStyles = (
    <style>{`
      html { font-size: 16px; }
      *, *::before, *::after { box-sizing: border-box; }
      body { margin: 0; background: ${C.bg}; overflow: hidden; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
      img, table { max-width: 100%; }
      * { -webkit-tap-highlight-color: transparent; }
      button, a, [role="button"], select { touch-action: manipulation; user-select: none; }
      @keyframes shimmer { 0% { left: -100%; } 100% { left: 200%; } }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
      @keyframes slideInLeft { from { transform: translateX(-100%); } to { transform: translateX(0); } }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(-10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes toastIn { from { opacity: 0; transform: translateX(calc(100% + 40px)); } to { opacity: 1; transform: translateX(0); } }
      @keyframes toastInMobile { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: translateY(0); } }
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: ${C.surface}; }
      ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
      select option { background: ${C.surface}; }
      .scroll-x { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      .apex-btn:not([disabled]):active { transform: scale(0.97) !important; transition: transform 0.08s ease !important; }
      @media (hover: hover) {
        .apex-card:hover { border-color: #3A3A48 !important; }
      }
      @media (max-width: 767px) {
        input, select, textarea { min-height: 48px; font-size: 16px !important; }
        button { min-height: 44px; }
      }
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    `}</style>
  );

  if (!supabaseConfigured) return <DeploymentConfigNotice />;

  if (authLoading || venuesLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {globalStyles}
        <Spinner size={32} />
      </div>
    );
  }

  if (!user) {
    const path = location.pathname;
    let PageEl;
    if (path === "/signin")   PageEl = <AuthScreen defaultMode="login" />;
    else if (path === "/register") PageEl = <AuthScreen defaultMode="register" />;
    else if (path === "/privacy")  PageEl = <PrivacyPolicyPage />;
    else if (path === "/terms")    PageEl = <TermsOfServicePage />;
    else if (path === "/cookies")  PageEl = <CookiePolicyPage />;
    else if (path === "/")         PageEl = <LandingPage />;
    else PageEl = <AuthScreen defaultMode="login" />;
    return <>{PageEl}<CookieBanner /></>;
  }

  // also allow authenticated users to view legal pages
  if (location.pathname === "/privacy") return <PrivacyPolicyPage />;
  if (location.pathname === "/terms")   return <TermsOfServicePage />;
  if (location.pathname === "/cookies") return <CookiePolicyPage />;

  if (venues.length === 0) {
    return (
      <>
        {globalStyles}
        <VenueGate
          onCreated={async (form) => {
            const v = await addVenue(form);
            if (v) { setVenueId(v.id); setPage("dashboard"); }
          }}
        />
      </>
    );
  }

  const pageProps = { venues: venuesWithLockStatus, sales, expenses, invoices, suppliers, stockItems, staff, venue, onVenueChange: handleVenueChange };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>
      {globalStyles}

      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar page={page} setPage={setPage} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} user={user} onLogout={handleLogout} subscription={subscription} />
      )}

      {/* Mobile: fixed top header */}
      {isMobile && (
        <MobileHeader page={page} onOpenDrawer={() => setDrawerOpen(true)} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} />
      )}

      {/* Mobile: slide-in drawer — always rendered, visibility controlled via CSS transform */}
      {isMobile && (
        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} page={page} setPage={setPage} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} user={user} onLogout={handleLogout} subscription={subscription} />
      )}

      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", height: "100vh", WebkitOverflowScrolling: "touch", paddingTop: isMobile ? 56 : 0, paddingBottom: isMobile ? "calc(60px + env(safe-area-inset-bottom))" : 0, maxWidth: isMobile ? undefined : "calc(100vw - 220px)" }}>
        <div key={page} style={{ animation: "fadeIn .18s ease", width: "100%", boxSizing: "border-box" }}>
          {page === "dashboard" && <DashboardPage {...pageProps} subscription={subscription} setPage={setPage} setInvoicesInitialFilter={setInvoicesInitialFilter} />}
          {page === "sales" && <SalesPage sales={sales} addSale={addSale} updateSale={updateSale} deleteSale={deleteSale} salesLoading={salesLoading} venues={venuesWithLockStatus} venue={venue} onVenueChange={handleVenueChange} subscription={subscription} setSubscription={setSubscription} staffList={staff} />}
          {page === "invoices" && <InvoicesPage invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} markInvoicePaid={markInvoicePaid} suppliers={suppliers} addSupplier={addSupplier} upsertStockItem={upsertStockItem} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} subscription={subscription} setSubscription={setSubscription} initialStatusFilter={invoicesInitialFilter} setPage={setPage} />}
          {page === "expenses" && <ExpensesPage expenses={expenses} addExpense={addExpense} updateExpense={updateExpense} deleteExpense={deleteExpense} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} />}
          {page === "suppliers" && <SuppliersPage suppliers={suppliers} addSupplier={addSupplier} updateSupplier={updateSupplier} deleteSupplier={deleteSupplier} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} />}
          {page === "stock" && <StockPage stockItems={stockItems} addStockItem={addStockItem} updateStockItem={updateStockItem} deleteStockItem={deleteStockItem} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} />}
          {page === "staff" && <StaffPage staff={staff} addStaff={addStaff} updateStaff={updateStaff} deleteStaff={deleteStaff} venue={venue} venues={venuesWithLockStatus} onVenueChange={handleVenueChange} />}
          {page === "analytics" && <AnalyticsPage sales={sales} expenses={expenses} invoices={invoices} venues={venuesWithLockStatus} venue={venue} onVenueChange={handleVenueChange} staff={staff} suppliers={suppliers} stockItems={stockItems} subscription={subscription} setPage={setPage} />}
          {page === "settings" && <SettingsPage venues={venuesWithLockStatus} addVenue={addVenue} deleteVenue={deleteVenue} user={user} subscription={subscription} setPage={setPage} />}
          {page === "pricing" && <PricingPage user={user} subscription={subscription} />}
        </div>
      </main>

      <UpgradePrompt
        open={!!upgradePrompt}
        feature={upgradePrompt}
        onClose={() => setUpgradePrompt(null)}
        setPage={setPage}
        venueLimit={venueLimit}
      />

      {/* Mobile: fixed bottom nav */}
      {isMobile && <BottomNav page={page} setPage={setPage} onOpenDrawer={() => setDrawerOpen(true)} />}
    </div>
  );
}
