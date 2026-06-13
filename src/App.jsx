import { useState, useEffect, useRef, useCallback } from "react";

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
import { useLocation, useNavigate, Link } from "react-router-dom";
import { supabase } from "./lib/supabase";
import Logo from "./components/Logo.jsx";
import PricingPage from "./pages/PricingPage.jsx";
import AnalyticsPage from "./pages/AnalyticsPage.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage.jsx";
import TermsOfServicePage from "./pages/TermsOfServicePage.jsx";
import CookiePolicyPage from "./pages/CookiePolicyPage.jsx";

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

// ─── CLAUDE API (proxied through /api/scan) ──────────────────────────────────
async function callClaude(messages, systemPrompt, imageBase64 = null, imageType = "image/jpeg") {
  const prompt = messages[messages.length - 1].content;

  const res = await fetch("/api/scan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, imageType, prompt, systemPrompt }),
  });

  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error || "Scan API error");
  }

  const { result } = await res.json();
  return result ?? "";
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
  const [dismissed, setDismissed] = useState(false);
  const isSm = useWindowWidth() < 768;
  if (venue || dismissed) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: C.amberDim, border: `1px solid ${C.amber}44`, borderRadius: 10, padding: isSm ? "8px 12px" : "10px 16px", marginBottom: isSm ? 14 : 20, gap: 8 }}>
      <span style={{ fontSize: isSm ? 11 : 13, color: C.amber }}>
        👁 {isSm ? "All venues — select one to add data." : "Viewing all venues. Select a specific venue to add new data."}
      </span>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: C.amber, cursor: "pointer", fontSize: 16, lineHeight: 1, flexShrink: 0, padding: "2px 4px" }}>✕</button>
    </div>
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

function UploadZone({ onFile, accept = "image/*", label = "Drop image or click to upload", loading }) {
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
      {loading ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}><Spinner size={28} /><span style={{ color: C.textSub, fontSize: 13 }}>Analysing with AI…</span></div>
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

// ─── COOKIE CONSENT BANNER ───────────────────────────────────────────────────
function CookieBanner() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem("cookie_consent") !== "accepted"
  );

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: C.surface, borderTop: `1px solid ${C.border}`,
      padding: "14px 24px 14px",
      display: "flex", alignItems: "center", justifyContent: "center",
      gap: 20, flexWrap: "wrap", fontSize: 13, color: C.textSub,
      boxShadow: "0 -4px 24px #00000044",
    }}>
      <span>
        🍪 We use essential cookies to keep you signed in. No tracking or advertising cookies.
      </span>
      <div style={{ display: "flex", gap: 10, flexShrink: 0, alignItems: "center" }}>
        <Link to="/cookies" style={{ fontSize: 13, color: C.accent, textDecoration: "none", fontWeight: 600 }}>
          Cookie Policy
        </Link>
        <button
          onClick={accept}
          style={{
            background: C.accent, color: "#fff", border: "none",
            borderRadius: 8, padding: "8px 20px", fontWeight: 700,
            fontSize: 13, cursor: "pointer",
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ defaultMode = "login" }) {
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
    if (!name || !email || !password) return setError("Please fill all fields.");
    if (!termsAgreed) return setError("You must agree to the Terms of Service and Privacy Policy.");
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, agreed_to_terms_at: new Date().toISOString() } },
    });
    if (error) setError(error.message);
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
          <p style={{ color: C.textSub, margin: 0, fontSize: 14 }}>Restaurant intelligence platform</p>
        </div>
        <Card>
          <div style={{ display: "flex", marginBottom: 24, gap: 8 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => switchMode(m)}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: mode === m ? C.accent : C.surfaceL, color: mode === m ? "#fff" : C.textSub, transition: "all .15s" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          {/* onKeyDown on the container catches Enter from any input inside */}
          <div onKeyDown={handleKeyDown} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <Input label="Full Name" value={name} onChange={setName} placeholder="João Silva" />}
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@restaurant.com" />
            <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
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
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Terms of Service</a>
                {" "}and{" "}
                <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Privacy Policy</a>
              </span>
            </label>
          )}
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>⚠ {error}</div>}
          <Btn
            onClick={mode === "login" ? login : register}
            loading={loading}
            disabled={mode === "register" && !termsAgreed}
            title={mode === "register" && !termsAgreed ? "Please agree to the Terms of Service and Privacy Policy" : undefined}
            style={{ width: "100%", justifyContent: "center", marginTop: 16 }}
            size="lg"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── MOBILE HEADER ───────────────────────────────────────────────────────────
const PAGE_NAMES = { dashboard: "Dashboard", sales: "Daily Sales", invoices: "Invoices", expenses: "Expenses", suppliers: "Suppliers", ingredients: "Ingredients", staff: "Staff", analytics: "Analytics & Reports", settings: "Settings", pricing: "Upgrade" };

function MobileHeader({ page, onOpenDrawer, venue }) {
  const venueName = venue ? (venue.name.length > 12 ? venue.name.slice(0, 12) + "…" : venue.name) : "All Venues";
  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 56, background: "#16161E", borderBottom: `1px solid ${C.border}`, zIndex: 200, display: "flex", alignItems: "center", paddingTop: "env(safe-area-inset-top)" }}>
      <button onClick={onOpenDrawer} style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: C.text, fontSize: 20, cursor: "pointer", flexShrink: 0 }}>☰</button>
      <div style={{ flex: 1, textAlign: "center", fontSize: 15, fontWeight: 600, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 4px" }}>
        {PAGE_NAMES[page] || "ApexManager"}
      </div>
      <button onClick={onOpenDrawer} style={{ minWidth: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 14, background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
        <span style={{ fontSize: 12, color: C.accent, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 100 }}>{venueName}</span>
      </button>
    </div>
  );
}

// ─── BOTTOM NAV ──────────────────────────────────────────────────────────────
const BOTTOM_NAV_ITEMS = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "sales",     icon: "💳", label: "Sales" },
  { id: "invoices",  icon: "🧾", label: "Invoices" },
  { id: "expenses",  icon: "💸", label: "Expenses" },
  { id: "more",      icon: "⋯",  label: "More" },
];

function BottomNav({ page, setPage, onOpenDrawer }) {
  const MORE_PAGES = ["analytics", "suppliers", "ingredients", "staff", "settings", "pricing"];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#16161E", borderTop: `1px solid ${C.border}`, zIndex: 200, display: "flex", paddingBottom: "env(safe-area-inset-bottom)" }}>
      {BOTTOM_NAV_ITEMS.map(n => {
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
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "sales",       icon: "💳", label: "Daily Sales" },
    { id: "invoices",    icon: "🧾", label: "Invoices" },
    { id: "expenses",    icon: "💸", label: "Expenses" },
    { id: "analytics",   icon: "📈", label: "Analytics & Reports" },
    { id: "settings",    icon: "⚙️", label: "Settings" },
  ];
  const dbItems = [
    { id: "suppliers",   icon: "🏭", label: "Suppliers" },
    { id: "ingredients", icon: "🥦", label: "Ingredients" },
    { id: "staff",       icon: "👥", label: "Staff" },
  ];
  const dbActive = ["suppliers","ingredients","staff"].includes(page);
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
              <div style={{ marginTop: 5 }}>
                {subscription.tier === "free" ? (
                  <span style={{ fontSize: 10, fontWeight: 700, background: C.amber + "22", color: C.amber, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.amber}44` }}>
                    Free · {subscription.scans_used_this_month ?? 0}/{subscription.scan_limit ?? 10} scans
                  </span>
                ) : (
                  <span style={{ fontSize: 10, fontWeight: 700, background: C.greenDim, color: C.green, padding: "2px 8px", borderRadius: 99, border: `1px solid ${C.green}44`, textTransform: "capitalize" }}>
                    {subscription.tier}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 6px", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        {venues.length > 0 && (
          <div style={{ padding: "10px 14px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: C.textMuted, marginBottom: 6 }}>Venue</div>
            <select value={venue?.id || ""} onChange={e => { onVenueChange(e.target.value); onClose(); }}
              style={{ width: "100%", background: C.surfaceL, border: `1px solid ${!venue ? C.amber + "88" : C.border}`, borderRadius: 8, color: !venue ? C.amber : C.text, fontSize: 15, padding: "10px 10px", outline: "none", fontFamily: "inherit", minHeight: 48 }}>
              <option value="">All Venues</option>
              {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
        <nav style={{ flex: 1, padding: "8px", overflowY: "auto", WebkitOverflowScrolling: "touch", display: "flex", flexDirection: "column", gap: 1 }}>
          {navItems.map(n => {
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
            <span style={{ flex: 1 }}>Data Base</span>
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
        </nav>
        <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
          {(subscription?.tier ?? "free") === "free" && (
            <div style={{ padding: "8px 8px 4px" }}>
              <button onClick={() => go("pricing")} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, height: 48, padding: "0 14px", borderRadius: 10, border: `1px solid ${C.accent}55`, cursor: "pointer", fontWeight: 700, fontSize: 14, background: `linear-gradient(135deg, ${C.accent}18, ${C.accent}28)`, color: C.accent }}>
                <span style={{ fontSize: 18 }}>⚡</span> Upgrade
              </button>
            </div>
          )}
          <div style={{ padding: "8px 14px 14px" }}>
            <button onClick={() => { onLogout(); onClose(); }} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, minHeight: 44 }}>🚪 Sign Out</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, venue, venues, onVenueChange, user, onLogout, subscription }) {
  const { pick } = useTypeScale();
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "sales", icon: "💳", label: "Daily Sales" },
    { id: "invoices", icon: "🧾", label: "Invoices" },
    { id: "expenses", icon: "💸", label: "Expenses" },
    { id: "analytics", icon: "📈", label: "Analytics & Reports" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];
  const dbItems = [
    { id: "suppliers",   icon: "🏭", label: "Suppliers" },
    { id: "ingredients", icon: "🥦", label: "Ingredients" },
    { id: "staff",       icon: "👥", label: "Staff" },
  ];
  const [dbOpen, setDbOpen] = useState(["suppliers", "ingredients", "staff"].includes(page));

  const todayStr = new Date().toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const dbActive = ["suppliers","ingredients","staff"].includes(page);
  return (
    <div style={{ width: 220, minWidth: 220, maxWidth: 220, flexShrink: 0, overflowX: "hidden", overflowY: "auto", height: "100vh", background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 10px 14px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <Logo size={27.5} />
        <div style={{ fontSize: 10, color: C.textSub, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.user_metadata?.name}</div>
        {subscription && (
          <div style={{ marginTop: 5 }}>
            {(subscription.tier === "free") ? (
              <span style={{ fontSize: pick(9, 12), fontWeight: 700, background: C.amber + "22", color: C.amber, padding: "1px 6px", borderRadius: 99, border: `1px solid ${C.amber}44` }}>
                Free · {subscription.scans_used_this_month ?? 0}/{subscription.scan_limit ?? 10} scans
              </span>
            ) : (
              <span style={{ fontSize: 9, fontWeight: 700, background: C.greenDim, color: C.green, padding: "1px 6px", borderRadius: 99, border: `1px solid ${C.green}44`, textTransform: "capitalize" }}>
                {subscription.tier}
              </span>
            )}
          </div>
        )}
      </div>
      {venues.length > 0 && (
        <div style={{ padding: "7px 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: C.textMuted }}>Venue</span>
            {!venue && <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.amber, display: "inline-block", flexShrink: 0 }} />}
          </div>
          <select value={venue?.id || ""} onChange={e => onVenueChange(e.target.value)}
            style={{ width: "100%", background: C.surfaceL, border: `1px solid ${!venue ? C.amber + "88" : C.border}`, borderRadius: 6, color: !venue ? C.amber : C.text, fontSize: pick(11, 14), padding: "5px 8px", outline: "none", fontFamily: "inherit" }}>
            <option value="">All Venues</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
          {!venue && <div style={{ fontSize: 9, color: C.amber, marginTop: 3 }}>Select a venue to add data</div>}
          <div style={{ fontSize: 9, color: C.textMuted, marginTop: 3 }}>{todayStr}</div>
        </div>
      )}
      <nav style={{ flex: 1, padding: "6px 5px", display: "flex", flexDirection: "column", gap: 1 }}>
        {navItems.map(n => {
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
            <span style={{ flex: 1, textAlign: "left" }}>Data Base</span>
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
      </nav>
      {/* Bottom actions */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}` }}>
        {(subscription?.tier ?? "free") === "free" && (
          <div style={{ padding: "6px 5px 4px" }}>
            <button onClick={() => setPage("pricing")}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 7, border: `1px solid ${C.accent}55`, cursor: "pointer", fontWeight: 700, fontSize: 12, background: page === "pricing" ? C.accentDim : `linear-gradient(135deg, ${C.accent}18, ${C.accent}28)`, color: C.accent }}>
              <span style={{ fontSize: 13 }}>⚡</span> Upgrade
            </button>
          </div>
        )}
        <div style={{ padding: "6px 10px 10px" }}>
          <button onClick={onLogout} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 5 }}>🚪 Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
function DashboardPage({ venues, sales, expenses, invoices, venue, subscription, setPage, setInvoicesInitialFilter }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isTablet = w >= 768 && w < 1024;
  const isWide = w >= 1280;
  const { pick } = useTypeScale();
  const [range, setRange] = useState("month");
  const [upgradeBanner, setUpgradeBanner] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      window.history.replaceState({}, "", window.location.pathname);
      return true;
    }
    return false;
  });

  const now = new Date();
  const filtered = sales.filter(s => {
    const d = new Date(s.date);
    if (range === "week") return (now - d) / 86400000 <= 7;
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
    { label: "Daily costs", value: totalDailyCosts, color: C.amber },
    { label: "Fixed expenses", value: totalFixedExp, color: C.red },
    { label: "Paid invoices", value: paidInvoices, color: C.blue },
    { label: "Net profit", value: Math.max(0, profit), color: C.green },
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

  const ranges = [{ v: "week", l: "7 Days" }, { v: "month", l: "This Month" }, { v: "year", l: "This Year" }, { v: "all", l: "All Time" }];
  const pad = pagePad(isMobile, isTablet);
  const chartH = isWide ? 120 : 90;
  const heroBig = pick(26, 32);
  const heroNet = pick(28, 36);

  const heroCol = (label, children) => (
    <div style={{ flex: 1, padding: isMobile ? "16px 12px" : "20px 16px", minWidth: 0, textAlign: "center", alignItems: "center", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: pick(11, 12), fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
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

      <div style={{ marginBottom: pick(18, 22) }}>
        {!isMobile && <h1 style={{ margin: "0 0 16px", fontSize: pageTitleSize(isMobile, isTablet, isWide), color: C.text }}>Dashboard</h1>}
        <div className="scroll-x" style={{ display: "flex", gap: 6 }}>
          {ranges.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              style={{ padding: `${pick(7, 8)}px ${pick(14, 16)}px`, borderRadius: 8, border: `1px solid ${range === r.v ? C.accent : C.border}`, background: range === r.v ? C.accentDim : "transparent", color: range === r.v ? C.accent : C.textSub, fontSize: pick(12, 13), cursor: "pointer", fontWeight: range === r.v ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1 — Money In vs Money Out */}
      <Card style={{ padding: isMobile ? 16 : 22, marginBottom: pick(14, 18) }}>
        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: "stretch" }}>
          {heroCol("Money In", <>
            <div style={{ fontSize: heroBig, fontWeight: 800, color: C.green, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(totalSales)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginTop: 8 }}>
              Cash {fmtEur(totalCash)} · Card {fmtEur(totalCard)}
            </div>
            <div style={{ fontSize: pick(11, 12), color: C.textMuted, marginTop: 4 }}>
              XPTO {fmtEur(totalXpto)} <span style={{ fontStyle: "italic" }}>(reference only)</span>
            </div>
          </>)}

          {!isMobile && <div style={{ width: 1, background: C.border, margin: "8px 0" }} />}

          {heroCol("Net Position", <>
            <div style={{ fontSize: heroNet, fontWeight: 800, color: profit >= 0 ? C.green : C.red, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(profit)}</div>
            <div style={{ fontSize: pick(12, 13), color: profit >= 0 ? C.green : C.red, marginTop: 8, fontWeight: 600 }}>
              {totalSales ? `${margin.toFixed(1)}% margin` : "—"}
            </div>
          </>)}

          {!isMobile && <div style={{ width: 1, background: C.border, margin: "8px 0" }} />}

          {heroCol("Money Out", <>
            <div style={{ fontSize: heroBig, fontWeight: 800, color: C.red, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>{fmtEur(totalCosts)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginTop: 8 }}>
              Daily {fmtEur(totalDailyCosts)} · Fixed {fmtEur(totalFixedExp)} · Paid inv. {fmtEur(paidInvoices)}
            </div>
          </>)}
        </div>
      </Card>

      {/* SECTION 2 — Metric cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: isMobile ? 10 : pick(12, 14), marginBottom: pick(14, 18), width: "100%" }}>
        <MetricCard label="Avg Daily Revenue" value={fmtEur(avgDailyRevenue)} sub={`${uniqueDays} active days`} color={C.accent} isWide={isWide} />
        <MetricCard label="Cash %" value={cashPct + "%"} sub={fmtEur(totalCash)} color={C.amber} isWide={isWide} />
        <MetricCard label="Card %" value={cardPct + "%"} sub={fmtEur(totalCard)} color={C.blue} isWide={isWide} />
        <MetricCard label="XPTO" value={fmtEur(totalXpto)} sub="Reference only" color={C.textSub} isWide={isWide} />
      </div>

      {filtered.length === 0 && pendingInvoices === 0 && (
        <EmptyState icon="📊" title="No data for this period" sub="Add daily sales logs to see your dashboard come to life." />
      )}

      {/* SECTION 3 — Visual money flow (desktop only) */}
      {!isMobile && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: pick(14, 16), marginBottom: pick(14, 18), width: "100%" }}>
          <Card>
            <div style={{ fontSize: pick(13, 14), color: C.textSub, marginBottom: pick(12, 14), fontWeight: 600 }}>Revenue by Week</div>
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
            <div style={{ fontSize: pick(13, 14), color: C.textSub, marginBottom: pick(12, 14), fontWeight: 600 }}>Where Revenue Goes</div>
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
                      title={`Net profit: ${fmtEur(profit)}`}
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
        <div style={{ fontSize: pick(14, 15), fontWeight: 700, color: C.text, marginBottom: 8 }}>⏳ Pending Payments</div>
        {pendingInvoices > 0 ? (
          <>
            <div style={{ fontSize: pick(24, 28), fontWeight: 800, color: C.amber, marginBottom: 8 }}>{fmtEur(pendingInvoices)}</div>
            <div style={{ fontSize: pick(12, 13), color: C.textSub, marginBottom: 14 }}>
              Not yet deducted from profit — mark invoices as paid when settled
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
                View All Invoices →
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
    </div>
  );
}

// ─── DAILY SALES PAGE ────────────────────────────────────────────────────────
function SaleCard({ s, venueName, onEdit, onDelete }) {
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
            <div><span style={{ fontSize: 11, color: C.textMuted }}>Cash </span><span style={{ fontSize: 13, color: C.amber, fontWeight: 600 }}>{fmtEur(s.cash || 0)}</span></div>
            <div><span style={{ fontSize: 11, color: C.textMuted }}>Card </span><span style={{ fontSize: 13, color: C.blue, fontWeight: 600 }}>{fmtEur(s.card || 0)}</span></div>
            {s.cash_expenses > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>Costs </span><span style={{ fontSize: 13, color: C.red, fontWeight: 600 }}>−{fmtEur(s.cash_expenses)}</span></div>}
            {s.xpto > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>XPTO </span><span style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>{fmtEur(s.xpto)}</span></div>}
            {s.pos > 0 && <div><span style={{ fontSize: 11, color: C.textMuted }}>POS Report </span><span style={{ fontSize: 13, color: C.textSub, fontWeight: 600 }}>{fmtEur(s.pos)}</span></div>}
          </div>
          {(s.staff || []).length > 0 && (
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8 }}>👥 {s.staff.join(", ")}</div>
          )}
          {s.note && <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic", marginBottom: 10 }}>{s.note}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => onEdit(s)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏ Edit</button>
            <button onClick={() => onDelete(s.id)} style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "5px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>🗑 Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StaffPicker({ staffList, selected, onChange }) {
  if (!staffList || staffList.length === 0) return (
    <div style={{ fontSize: 12, color: C.textMuted, fontStyle: "italic" }}>No staff in database — add members in Data Base → Staff.</div>
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
          ? `${m.name} (${m.status === "sick_leave" ? "Sick Leave" : "Holidays"} until ${new Date(m.status_until + "T12:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })})`
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

function SalesPage({ sales, addSale, updateSale, deleteSale, salesLoading, venues, venue, subscription, setSubscription, staffList }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: today(), cash: "", card: "", cashExpenses: "", xpto: "", pos: "", note: "", staff: [] });
  const [scanMode, setScanMode] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLimitReached, setScanLimitReached] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [editSale, setEditSale] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const save = async () => {
    setSaving(true);
    setSaveError("");
    const { error } = await addSale({
      venue_id: venue?.id || null,
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
    const used = subscription?.scans_used_this_month ?? 0;
    const limit = subscription?.scan_limit ?? 10;
    if (used >= limit) { setScanLimitReached(true); return; }

    setScanLoading(true);
    try {
      const b64 = await fileToBase64(file);
      const result = await callClaude(
        [{ role: "user", content: "Extract daily sales data from this receipt/ticket. Return ONLY valid JSON with fields: cash (number), card (number), total (number), date (YYYY-MM-DD or null), notes (string)." }],
        "You are a data extraction assistant for restaurant management. Extract financial data from receipt images precisely. Return only valid JSON, no markdown.",
        b64, file.type
      );
      const clean = result.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      setScanResult(data);
      setForm(prev => ({
        ...prev,
        cash: data.cash?.toString() || prev.cash,
        card: data.card?.toString() || prev.card,
        date: data.date || prev.date,
        note: data.notes || prev.note,
      }));
      setScanMode(false);
      const newCount = used + 1;
      supabase.from("subscriptions").update({ scans_used_this_month: newCount }).eq("user_id", subscription.user_id);
      setSubscription(prev => ({ ...prev, scans_used_this_month: newCount }));
    } catch (e) {
      alert("Could not parse receipt. Please fill in manually.");
    }
    setScanLoading(false);
  };

  if (salesLoading) {
    return (
      <div style={{ padding: "28px 32px", display: "flex", alignItems: "center", gap: 10, color: C.textSub, fontSize: 14 }}>
        <Spinner size={20} /> Loading sales…
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
        <div style={{ background: "#F0406022", border: "1px solid #F0406044", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.red }}>
            You've used all {subscription?.scan_limit ?? 10} AI scans for this month. Resets on the 1st.{" "}
            <strong>Upgrade for unlimited scans.</strong>
          </span>
          <button onClick={() => setScanLimitReached(false)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, isWide), color: C.text }}>Daily Sales Log</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => { setScanMode(true); setShowAdd(true); }} size={isMobile ? "sm" : "md"}>📷 {isMobile ? "Scan" : "Scan Receipt"}</Btn>
          <Btn onClick={() => { setScanMode(false); setShowAdd(true); }} size={isMobile ? "sm" : "md"}>+ {isMobile ? "Add" : "Add Entry"}</Btn>
        </div>
      </div>

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={scanMode ? "Scan Daily Receipt" : "Add Sales Log"}>
        {scanMode && !scanResult && (
          <div style={{ marginBottom: 20 }}>
            <UploadZone onFile={scanReceipt} loading={scanLoading} label="Upload photo of daily sales ticket" />
          </div>
        )}
        {scanResult && (
          <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>
            ✓ Receipt scanned. Review and save below.
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} /></div>
          <Input label="Cash Sales (€)" type="number" value={form.cash} onChange={v => setForm(p => ({ ...p, cash: v }))} placeholder="0.00" prefix="€" />
          <Input label="Card Sales (€)" type="number" value={form.card} onChange={v => setForm(p => ({ ...p, card: v }))} placeholder="0.00" prefix="€" />
          <Input label="Cash Expenses (€)" type="number" value={form.cashExpenses} onChange={v => setForm(p => ({ ...p, cashExpenses: v }))} placeholder="0.00" prefix="€" />
          <Input label="XPTO / Other (€)" type="number" value={form.xpto} onChange={v => setForm(p => ({ ...p, xpto: v }))} placeholder="0.00" prefix="€" />
          <Input label="POS Report (€)" type="number" value={form.pos} onChange={v => setForm(p => ({ ...p, pos: v }))} placeholder="0.00" prefix="€" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>Staff Attendance</div>
            <StaffPicker staffList={staffList} selected={form.staff} onChange={v => setForm(p => ({ ...p, staff: v }))} />
          </div>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Notes" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} placeholder="Optional notes…" /></div>
        </div>
        {saveError && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{saveError}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setSaveError(""); }}>Cancel</Btn>
          <Btn onClick={save} loading={saving} disabled={!venue || saving} title={!venue ? "Select a venue first" : undefined}>Save Entry</Btn>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editForm && (
        <Modal open={!!editSale} onClose={() => { setEditSale(null); setEditForm(null); }} title="Edit Sales Entry">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Date" type="date" value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} /></div>
            <Input label="Cash Sales (€)" type="number" value={editForm.cash} onChange={v => setEditForm(p => ({ ...p, cash: v }))} placeholder="0.00" prefix="€" />
            <Input label="Card Sales (€)" type="number" value={editForm.card} onChange={v => setEditForm(p => ({ ...p, card: v }))} placeholder="0.00" prefix="€" />
            <Input label="Cash Expenses (€)" type="number" value={editForm.cashExpenses} onChange={v => setEditForm(p => ({ ...p, cashExpenses: v }))} placeholder="0.00" prefix="€" />
            <Input label="XPTO / Other (€)" type="number" value={editForm.xpto} onChange={v => setEditForm(p => ({ ...p, xpto: v }))} placeholder="0.00" prefix="€" />
            <Input label="POS Report (€)" type="number" value={editForm.pos} onChange={v => setEditForm(p => ({ ...p, pos: v }))} placeholder="0.00" prefix="€" />
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>Staff Attendance</div>
              <StaffPicker staffList={staffList} selected={editForm.staff || []} onChange={v => setEditForm(p => ({ ...p, staff: v }))} />
            </div>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Notes" value={editForm.note} onChange={v => setEditForm(p => ({ ...p, note: v }))} placeholder="Optional notes…" /></div>
          </div>
          {editError && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>{editError}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
            <Btn variant="ghost" onClick={() => { setEditSale(null); setEditForm(null); }}>Cancel</Btn>
            <Btn onClick={saveEdit} loading={editSaving} disabled={editSaving}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0
            ? <EmptyState icon="💳" title="No sales entries yet" sub="Log your daily sales manually or scan a receipt with AI." action={<Btn onClick={() => setShowAdd(true)}>+ Add First Entry</Btn>} />
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
const STAFF_STATUSES = [
  { value: "active",     label: "Active",       color: "#22C55E" },
  { value: "part_time",  label: "Part-Time",    color: "#60A5FA" },
  { value: "holidays",   label: "On Holidays",  color: "#F59E0B" },
  { value: "sick_leave", label: "Sick Leave",   color: "#F04060" },
];

function staffStatusColor(status) {
  return STAFF_STATUSES.find(s => s.value === status)?.color || C.textMuted;
}

function staffStatusLabel(member) {
  const opt = STAFF_STATUSES.find(s => s.value === member.status);
  if (!opt) return "Active";
  if (["holidays", "sick_leave"].includes(member.status) && member.status_until) {
    const d = new Date(member.status_until + "T12:00:00");
    return `${opt.label} until ${d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "2-digit" })}`;
  }
  return opt.label;
}

function StaffPage({ staff, addStaff, updateStaff, deleteStaff, venue }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const EMPTY_FORM = { name: "", birth_date: "", phone: "", job_title: "", status: "active", status_from: "", status_until: "" };
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const filtered = venue ? staff.filter(s => !s.venue_id || s.venue_id === venue.id) : staff;
  const sorted = [...filtered].sort((a, b) => {
    const ord = { active: 0, part_time: 1, holidays: 2, sick_leave: 3 };
    return (ord[a.status] ?? 0) - (ord[b.status] ?? 0) || a.name.localeCompare(b.name);
  });

  const openAdd = () => { setForm(EMPTY_FORM); setEditing(null); setShowModal(true); };
  const openEdit = (m) => {
    setForm({ name: m.name || "", birth_date: m.birth_date || "", phone: m.phone || "", job_title: m.job_title || "", status: m.status || "active", status_from: m.status_from || "", status_until: m.status_until || "" });
    setEditing(m);
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const needsDates = ["holidays", "sick_leave"].includes(form.status);
    const payload = {
      venue_id: venue?.id || null,
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, false), color: C.text }}>Staff</h1>
        <Btn onClick={openAdd}>+ Add Staff Member</Btn>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon="👥" title="No staff members yet" sub="Add your team to quickly select attendance when logging daily sales." action={<Btn onClick={openAdd}>+ Add First Member</Btn>} />
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
                      {staffStatusLabel(m)}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
                    {m.job_title && <span style={{ fontSize: 12, color: C.textSub }}>{m.job_title}</span>}
                    {m.phone && <span style={{ fontSize: 12, color: C.textMuted }}>{m.phone}</span>}
                    {m.birth_date && <span style={{ fontSize: 12, color: C.textMuted }}>{new Date(m.birth_date + "T12:00:00").toLocaleDateString("en-GB")}</span>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openEdit(m)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>✏ Edit</button>
                  <button onClick={() => handleDelete(m.id)} disabled={!!deletingId} style={{ background: "#F0406011", border: "1px solid #F0406033", color: C.red, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600, opacity: deletingId === m.id ? 0.4 : 1 }}>✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? "Edit Staff Member" : "Add Staff Member"}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <Input label="Full Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Ana Silva" />
          <Input label="Job Title" value={form.job_title} onChange={v => setForm(p => ({ ...p, job_title: v }))} placeholder="e.g. Chef, Waiter" />
          <Input label="Phone Number" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351..." />
          <Input label="Birth Date" type="date" value={form.birth_date} onChange={v => setForm(p => ({ ...p, birth_date: v }))} />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 8, fontWeight: 600 }}>Status</div>
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
              <Input label="From" type="date" value={form.status_from} onChange={v => setForm(p => ({ ...p, status_from: v }))} />
              <Input label="Until" type="date" value={form.status_until} onChange={v => setForm(p => ({ ...p, status_until: v }))} />
            </>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
          <Btn variant="ghost" onClick={() => setShowModal(false)}>Cancel</Btn>
          <Btn onClick={save} loading={saving} disabled={!form.name.trim() || saving}>{editing ? "Save Changes" : "Add Member"}</Btn>
        </div>
      </Modal>
    </div>
  );
}

function DueDateBadge({ dueDate }) {
  if (!dueDate) return null;
  const due = new Date(dueDate + "T12:00:00");
  const now = new Date();
  const daysLeft = Math.ceil((due - now) / 86400000);
  const isOverdue = daysLeft < 0;
  const isSoon = !isOverdue && daysLeft <= 7;
  const color = isOverdue ? C.red : isSoon ? C.amber : C.textSub;
  const bg = isOverdue ? "#F0406014" : isSoon ? C.amber + "18" : C.surfaceL;
  const label = isOverdue
    ? `Overdue ${Math.abs(daysLeft)}d`
    : isSoon
    ? `Due in ${daysLeft}d`
    : `Due ${due.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  return (
    <span style={{ background: bg, border: `1px solid ${color}55`, color, borderRadius: 5, padding: "1px 7px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", letterSpacing: 0.2 }}>
      {label}
    </span>
  );
}

function AmountsRow({ subtotal, tax, total, totalColor }) {
  return (
    <div style={{ display: "flex" }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Net</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{fmtEur(subtotal || 0)}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Tax</div>
        <div style={{ fontSize: 13, color: C.textSub }}>{fmtEur(tax || 0)}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>Total</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: totalColor || C.text }}>{fmtEur(total || 0)}</div>
      </div>
    </div>
  );
}

function SupplierInvoiceGroup({ name, invs, onMarkPaid, onEdit, payingId }) {
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
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Pending invoices</div>
              <div style={{ fontSize: 13, color: C.amber, fontWeight: 700 }}>{pending.length}</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 70 }}>
              <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>Amount due</div>
              <div style={{ fontSize: 14, color: C.amber, fontWeight: 700 }}>{fmtEur(pendingTotal)}</div>
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
              <div style={{ fontSize: 9, fontWeight: 700, color: C.amber, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Pending</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {pending.map(inv => (
                  <div key={inv.id} style={{ background: C.surfaceL, borderRadius: 9, padding: "9px 12px" }}>
                    {/* Row 1: [invoice nr] [dates centered] [action buttons] */}
                    <div style={{ display: "flex", alignItems: "center", marginBottom: 7 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text, flex: "0 0 auto" }}>
                        {inv.invoice_number ? <><span style={{ color: C.textMuted, fontWeight: 400 }}>Invoice Nr: </span>{`#${inv.invoice_number}`}</> : <span style={{ color: C.textMuted, fontStyle: "italic" }}>No ref.</span>}
                      </span>
                      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                        <span style={{ fontSize: 11, color: C.textMuted }}>{inv.date}</span>
                        {inv.due_date && <DueDateBadge dueDate={inv.due_date} />}
                      </div>
                      <div style={{ display: "flex", gap: 6, flex: "0 0 auto" }}>
                        <button onClick={() => onEdit(inv)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 6, padding: "3px 9px", fontSize: 11, cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap" }}>✏ Edit</button>
                        <Btn variant="green" size="sm" loading={payingId === inv.id} onClick={() => onMarkPaid(inv.id)}>✓ Mark Paid</Btn>
                      </div>
                    </div>
                    {/* Row 2: amounts */}
                    <AmountsRow subtotal={inv.subtotal} tax={inv.tax} total={inv.total} totalColor={C.amber} />
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
              <div style={{ fontSize: 9, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>Paid</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {paid.map(inv => (
                  <div key={inv.id} style={{ borderRadius: 7, overflow: "hidden" }}>
                    {/* compact row */}
                    <div onClick={() => setExpandedPaidId(id => id === inv.id ? null : inv.id)}
                      style={{ display: "flex", alignItems: "center", gap: 0, padding: "7px 8px", cursor: "pointer", background: expandedPaidId === inv.id ? C.surfaceL : "transparent" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.textSub, flex: "0 0 90px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inv.invoice_number ? `Invoice Nr: #${inv.invoice_number}` : "No ref."}
                      </span>
                      <span style={{ fontSize: 11, color: C.textMuted, flex: "0 0 80px" }}>{inv.date}</span>
                      <span style={{ flex: 1 }} />
                      <Badge color={C.green}>Paid</Badge>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.green, minWidth: 72, textAlign: "right", marginLeft: 8 }}>{fmtEur(inv.total || 0)}</span>
                      <span style={{ fontSize: 10, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: expandedPaidId === inv.id ? "rotate(180deg)" : "rotate(0deg)", marginLeft: 6, flexShrink: 0 }}>▾</span>
                    </div>
                    {/* expanded detail */}
                    {expandedPaidId === inv.id && (
                      <div style={{ padding: "8px 10px 10px", background: C.surfaceL, borderTop: `1px solid ${C.border}` }}>
                        <div style={{ marginBottom: 6 }}>
                          <AmountsRow subtotal={inv.subtotal} tax={inv.tax} total={inv.total} totalColor={C.green} />
                        </div>
                        {inv.due_date && <div style={{ marginBottom: 6 }}><DueDateBadge dueDate={inv.due_date} /></div>}
                        {inv.items && inv.items.length > 0 && (
                          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>{inv.items.slice(0, 3).map(i => i.name).join(", ")}{inv.items.length > 3 ? ` +${inv.items.length - 3} more` : ""}</div>
                        )}
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button onClick={() => onEdit(inv)} style={{ background: C.accentDim, border: `1px solid ${C.accent}44`, color: C.accent, borderRadius: 6, padding: "3px 10px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}>✏ Edit</button>
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

function InvoicesPage({ invoices, addInvoice, updateInvoice, markInvoicePaid, suppliers, addSupplier, upsertIngredient, venue, subscription, setSubscription, initialStatusFilter }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const [showScan, setShowScan] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [editItems, setEditItems] = useState([]);
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

  const byVenue = venue ? invoices.filter(i => i.venue_id === venue.id) : invoices;
  const visible = statusFilter === "all" ? byVenue : byVenue.filter(i => i.status === statusFilter);

  const supplierGroups = [...new Set(visible.map(i => i.supplier_name || "Unknown"))]
    .map(name => ({ name, invs: visible.filter(i => (i.supplier_name || "Unknown") === name) }))
    .sort((a, b) => {
      const ap = a.invs.filter(i => i.status === "pending").length;
      const bp = b.invs.filter(i => i.status === "pending").length;
      return bp - ap || b.invs.length - a.invs.length;
    });

  const handleSupplierSelect = (id) => {
    setSelectedSupplierId(id);
    const sup = suppliers.find(s => s.id === id);
    if (sup) setManualForm(prev => ({ ...prev, supplier: sup.name, nif: sup.nif || "", iban: sup.iban || "" }));
  };

  const scanInvoice = async (file) => {
    const used = subscription?.scans_used_this_month ?? 0;
    const limit = subscription?.scan_limit ?? 10;
    if (used >= limit) { setScanLimitReached(true); return; }

    setScanLoading(true);
    try {
      const b64 = await fileToBase64(file);
      const raw = await callClaude(
        [{ role: "user", content: `Analyse this supplier invoice image and extract ALL data. Return ONLY valid JSON with exactly these fields:
{
  "supplierName": "string",
  "supplierNIF": "string or null",
  "supplierIBAN": "string or null",
  "supplierAddress": "string or null",
  "supplierPhone": "string or null",
  "date": "YYYY-MM-DD or null",
  "invoiceNumber": "string or null",
  "items": [{"name":"string","qty":number,"unit":"string","unitPrice":number,"total":number}],
  "subtotal": number,
  "tax": number,
  "taxRate": number,
  "total": number,
  "currency": "EUR"
}` }],
        "You are a precise invoice data extraction engine for a restaurant management system. Extract every line item with accuracy. Return ONLY valid JSON.",
        b64, file.type
      );
      const clean = raw.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      setExtracted(data);
      setEditItems(data.items || []);
      setScanLoading(false);
      // increment usage counter
      const newCount = used + 1;
      supabase.from("subscriptions").update({ scans_used_this_month: newCount }).eq("user_id", subscription.user_id);
      setSubscription(prev => ({ ...prev, scans_used_this_month: newCount }));
    } catch (e) {
      setScanLoading(false);
      alert("Could not parse invoice. Try manual entry.");
    }
  };

  const saveExtracted = async () => {
    if (!extracted) return;
    setSavingExtracted(true);

    const existsByNif = suppliers.find(s => s.nif && s.nif === extracted.supplierNIF);
    if (!existsByNif) {
      await addSupplier({
        name: extracted.supplierName || "Unknown",
        nif: extracted.supplierNIF || null,
        iban: extracted.supplierIBAN || null,
        address: extracted.supplierAddress || null,
        phone: extracted.supplierPhone || null,
        email: null,
        category: null,
      });
    }

    await addInvoice({
      venueId: venue?.id || null,
      supplierName: extracted.supplierName || "Unknown",
      supplierNif: extracted.supplierNIF || null,
      supplierIban: extracted.supplierIBAN || null,
      date: extracted.date || today(),
      dueDate: null,
      invoiceNumber: extracted.invoiceNumber || "",
      items: editItems,
      subtotal: extracted.subtotal || 0,
      tax: extracted.tax || 0,
      total: extracted.total || 0,
    });

    for (const item of editItems) {
      await upsertIngredient({
        name: item.name,
        unit: item.unit || "un",
        last_price: item.unitPrice,
        supplier: extracted.supplierName || "",
      });
    }

    setSavingExtracted(false);
    setExtracted(null); setEditItems([]); setShowScan(false);
  };

  const saveManual = async () => {
    if (!manualForm.supplier.trim()) return;
    setSavingManual(true);
    // Auto-create supplier profile if not already in DB
    const existsByName = suppliers.find(s => s.name.toLowerCase() === manualForm.supplier.trim().toLowerCase());
    if (!existsByName) {
      await addSupplier({ name: manualForm.supplier.trim(), nif: manualForm.nif || null, iban: manualForm.iban || null, address: null, phone: null, email: null, category: null });
    }
    await addInvoice({
      venueId: venue?.id || null,
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
    setShowManual(false);
    setSelectedSupplierId("");
    setManualForm({ supplier: "", invoiceNumber: "", date: today(), dueDate: "", subtotal: "", tax: "", total: "", iban: "", nif: "" });
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
    setToast("Invoice marked as paid ✓");
    setTimeout(() => setToast(""), 2500);
  };

  const pendingCount = byVenue.filter(i => i.status === "pending").length;
  const paidCount   = byVenue.filter(i => i.status === "paid").length;

  const sumTotal   = byVenue.reduce((a, i) => a + (i.total || 0), 0);
  const sumPending = byVenue.filter(i => i.status === "pending").reduce((a, i) => a + (i.total || 0), 0);
  const sumPaid    = byVenue.filter(i => i.status === "paid").reduce((a, i) => a + (i.total || 0), 0);
  const supplierCount = new Set(byVenue.map(i => i.supplier_name).filter(Boolean)).size;

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <AllVenuesBanner venue={venue} />
      {scanLimitReached && (
        <div style={{ background: "#F0406022", border: "1px solid #F0406044", borderRadius: 10, padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 13, color: C.red }}>
            You've used all {subscription?.scan_limit ?? 10} AI scans for this month. Resets on the 1st.{" "}
            <strong>Upgrade for unlimited scans.</strong>
          </span>
          <button onClick={() => setScanLimitReached(false)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 18, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, isWide), color: C.text }}>Invoices</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" size={isMobile ? "sm" : "md"} onClick={() => setShowManual(true)}>{isMobile ? "+ Manual" : "+ Manual Entry"}</Btn>
          <Btn size={isMobile ? "sm" : "md"} onClick={() => setShowScan(true)}>📷 {isMobile ? "Scan" : "Scan Invoice"}</Btn>
        </div>
      </div>

      {/* INVOICE SUMMARY — hide on wide (shown in right panel instead) */}
      {byVenue.length > 0 && !isWide && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: "12px 18px", background: C.surfaceL, borderRadius: 10, marginBottom: 16, fontSize: 13, border: `1px solid ${C.border}` }}>
          <span style={{ color: C.textSub }}>{byVenue.length} invoice{byVenue.length !== 1 ? "s" : ""}</span>
          <span>Total: <strong style={{ color: C.text }}>{fmtEur(sumTotal)}</strong></span>
          <span>Pending: <strong style={{ color: C.amber }}>{fmtEur(sumPending)}</strong></span>
          <span>Paid: <strong style={{ color: C.green }}>{fmtEur(sumPaid)}</strong></span>
        </div>
      )}

      {/* STATUS FILTER BAR */}
      <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { val: "all",     label: `All (${byVenue.length})` },
          { val: "pending", label: `Pending (${pendingCount})`, color: C.amber },
          { val: "paid",    label: `Paid (${paidCount})`,    color: C.green },
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
      <Modal open={showScan} onClose={() => { setShowScan(false); setExtracted(null); setEditItems([]); }} title="Scan Supplier Invoice" width={700}>
        {!extracted ? (
          <UploadZone onFile={scanInvoice} loading={scanLoading} label="Upload photo or PDF of supplier invoice" />
        ) : (
          <div>
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>✓ Invoice extracted. Review before saving.</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><div style={{ fontSize: 11, color: C.textSub }}>Supplier</div><div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{extracted.supplierName || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>NIF / Tax ID</div><div style={{ fontSize: 14, color: C.text }}>{extracted.supplierNIF || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>IBAN</div><div style={{ fontSize: 14, color: C.text, fontFamily: "monospace" }}>{extracted.supplierIBAN || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>Date</div><div style={{ fontSize: 14, color: C.text }}>{extracted.date || "—"}</div></div>
            </div>
            <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 8 }}>LINE ITEMS</div>
            <div className="scroll-x" style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 360 }}>
                <thead>
                  <tr style={{ background: C.surfaceL }}>
                    {["Item", "Qty", "Unit", "Unit Price", "Total"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: C.textMuted, fontWeight: 500, fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editItems.map((item, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 12px", color: C.text }}>{item.name}</td>
                      <td style={{ padding: "8px 12px", color: C.textSub }}>{item.qty}</td>
                      <td style={{ padding: "8px 12px", color: C.textSub }}>{item.unit}</td>
                      <td style={{ padding: "8px 12px", color: C.amber }}>{fmtEur(item.unitPrice)}</td>
                      <td style={{ padding: "8px 12px", color: C.text, fontWeight: 600 }}>{fmtEur(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 12, fontSize: 14 }}>
              <span style={{ color: C.textSub }}>Subtotal: {fmtEur(extracted.subtotal)}</span>
              <span style={{ color: C.textSub }}>Tax: {fmtEur(extracted.tax)}</span>
              <span style={{ color: C.text, fontWeight: 700 }}>Total: {fmtEur(extracted.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
              <Btn variant="ghost" onClick={() => { setExtracted(null); setEditItems([]); }}>Re-scan</Btn>
              <Btn variant="green" loading={savingExtracted} disabled={!venue} title={!venue ? "Select a venue first" : undefined} onClick={saveExtracted}>✓ Save Invoice & Update Costs</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* MANUAL ENTRY MODAL */}
      <Modal open={showManual} onClose={() => { setShowManual(false); setSelectedSupplierId(""); setManualForm({ supplier: "", invoiceNumber: "", date: today(), dueDate: "", subtotal: "", tax: "", total: "", iban: "", nif: "" }); }} title="Manual Invoice Entry">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          {suppliers.length > 0 && (
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}>
              <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>Select existing supplier (auto-fills details)</div>
              <select value={selectedSupplierId} onChange={e => handleSupplierSelect(e.target.value)}
                style={{ width: "100%", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, padding: "8px 10px", outline: "none", fontFamily: "inherit" }}>
                <option value="">— New supplier —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}{s.nif ? ` · ${s.nif}` : ""}</option>)}
              </select>
            </div>
          )}
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Supplier Name *" value={manualForm.supplier} onChange={v => setManualForm(p => ({ ...p, supplier: v }))} placeholder="Supplier name" /></div>
          <Input label="Invoice Number" value={manualForm.invoiceNumber} onChange={v => setManualForm(p => ({ ...p, invoiceNumber: v }))} placeholder="INV-001" />
          <Input label="Invoice Date" type="date" value={manualForm.date} onChange={v => setManualForm(p => ({ ...p, date: v }))} />
          <Input label="Due Date" type="date" value={manualForm.dueDate} onChange={v => setManualForm(p => ({ ...p, dueDate: v }))} />
          <Input label="NIF / Tax ID" value={manualForm.nif} onChange={v => setManualForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label="IBAN" value={manualForm.iban} onChange={v => setManualForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000…" />
          <Input label="Net Amount (€)" type="number" value={manualForm.subtotal} onChange={v => setManualForm(p => ({ ...p, subtotal: v }))} prefix="€" />
          <Input label="Tax (€)" type="number" value={manualForm.tax} onChange={v => setManualForm(p => ({ ...p, tax: v }))} prefix="€" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Total (€)" type="number" value={manualForm.total} onChange={v => setManualForm(p => ({ ...p, total: v }))} prefix="€" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowManual(false)}>Cancel</Btn>
          <Btn loading={savingManual} disabled={!venue || !manualForm.supplier.trim()} title={!venue ? "Select a venue first" : !manualForm.supplier.trim() ? "Enter supplier name" : undefined} onClick={saveManual}>Save Invoice</Btn>
        </div>
      </Modal>

      {/* EDIT INVOICE MODAL */}
      {editForm && (
        <Modal open={!!editInvoice} onClose={() => { setEditInvoice(null); setEditForm(null); }} title="Edit Invoice">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Supplier Name" value={editForm.supplier} onChange={v => setEditForm(p => ({ ...p, supplier: v }))} /></div>
            <Input label="Invoice Number" value={editForm.invoiceNumber} onChange={v => setEditForm(p => ({ ...p, invoiceNumber: v }))} placeholder="INV-001" />
            <Input label="Invoice Date" type="date" value={editForm.date} onChange={v => setEditForm(p => ({ ...p, date: v }))} />
            <Input label="Due Date" type="date" value={editForm.dueDate} onChange={v => setEditForm(p => ({ ...p, dueDate: v }))} />
            <Input label="NIF / Tax ID" value={editForm.nif} onChange={v => setEditForm(p => ({ ...p, nif: v }))} />
            <Input label="IBAN" value={editForm.iban} onChange={v => setEditForm(p => ({ ...p, iban: v }))} />
            <Input label="Net Amount (€)" type="number" value={editForm.subtotal} onChange={v => setEditForm(p => ({ ...p, subtotal: v }))} prefix="€" />
            <Input label="Tax (€)" type="number" value={editForm.tax} onChange={v => setEditForm(p => ({ ...p, tax: v }))} prefix="€" />
            <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Total (€)" type="number" value={editForm.total} onChange={v => setEditForm(p => ({ ...p, total: v }))} prefix="€" /></div>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
            <Btn variant="ghost" onClick={() => { setEditInvoice(null); setEditForm(null); }}>Cancel</Btn>
            <Btn loading={savingEdit} disabled={savingEdit} onClick={saveEdit}>Save Changes</Btn>
          </div>
        </Modal>
      )}

      {/* LIST — 2-col on wide screens */}
      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {visible.length === 0
            ? <EmptyState icon="🧾" title={statusFilter === "all" ? "No invoices yet" : `No ${statusFilter} invoices`} sub={statusFilter === "all" ? "Scan a supplier invoice with AI to automatically extract items, prices, taxes and supplier data." : undefined} action={statusFilter === "all" ? <Btn onClick={() => setShowScan(true)}>📷 Scan First Invoice</Btn> : undefined} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {supplierGroups.map(g => (
                  <SupplierInvoiceGroup key={g.name} name={g.name} invs={g.invs} onMarkPaid={handleMarkPaid} onEdit={openEdit} payingId={payingId} />
                ))}
              </div>
            )}
        </div>
        {isWide && (
          <div style={{ width: 260, flexShrink: 0 }}>
            <Card style={{ position: "sticky", top: 20 }}>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: .8, marginBottom: 16 }}>Summary</div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>Total Spend</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.text }}>{fmtEur(sumTotal)}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{byVenue.length} invoice{byVenue.length !== 1 ? "s" : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>Pending</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: C.amber }}>{fmtEur(sumPending)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: C.textSub, marginBottom: 3 }}>Paid</div>
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
    </div>
  );
}

// ─── EXPENSES PAGE ───────────────────────────────────────────────────────────
function ExpensesPage({ expenses, addExpense, deleteExpense, venue }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isWide = w >= 1280;
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
  const [filter, setFilter] = useState("ALL");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const filtered = (venue ? expenses.filter(e => e.venue_id === venue.id) : expenses).filter(e => filter === "ALL" || e.type === filter);

  const types = ["SERVICES", "WAGES", "RENT", "OTHER"];
  const typeColors = { SERVICES: C.blue, WAGES: C.amber, RENT: C.red, OTHER: C.textSub };

  const save = async () => {
    if (!form.name.trim()) return;
    setError("");
    setSaving(true);
    await addExpense({ venue_id: venue?.id || null, ...form });
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, isWide), color: C.text }}>Fixed Expenses</h1>
        <Btn onClick={() => setShowAdd(true)}>+ Add Expense</Btn>
      </div>

      <div className="scroll-x" style={{ display: "flex", gap: 6, marginBottom: isMobile ? 16 : 20 }}>
        {["ALL", ...types].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={{ padding: "5px 13px", borderRadius: 99, border: `1px solid ${filter === t ? (typeColors[t] || C.accent) : C.border}`, background: filter === t ? (typeColors[t] + "22" || C.accentDim) : "transparent", color: filter === t ? (typeColors[t] || C.accent) : C.textSub, fontSize: 12, cursor: "pointer", fontWeight: filter === t ? 600 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
            {t}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, color: C.text, display: "flex", alignItems: "center", flexShrink: 0 }}>Total: <strong style={{ marginLeft: 6, color: C.red }}>{fmtEur(total)}</strong></div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setError(""); }} title="Add Fixed Expense">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Expense Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Electricity bill" /></div>
          <Input label="Amount (€)" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} prefix="€" />
          <Input label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
          <Select label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={types.map(t => ({ value: t, label: t }))} />
          <Select label="Recurring" value={form.recurring} onChange={v => setForm(p => ({ ...p, recurring: v }))}
            options={[{ value: "ONE_TIME", label: "One Time" }, { value: "WEEKLY", label: "Weekly" }, { value: "MONTHLY", label: "Monthly" }, { value: "ANNUALLY", label: "Annually" }]} />
        </div>
        {error && <div style={{ color: C.red, fontSize: 12, marginTop: 10 }}>⚠ {error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setError(""); }}>Cancel</Btn>
          <Btn loading={saving} disabled={!venue} title={!venue ? "Select a venue first" : undefined} onClick={save}>Save Expense</Btn>
        </div>
      </Modal>

      <div style={{ display: isWide ? "flex" : "block", gap: 24, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {filtered.length === 0
            ? <EmptyState icon="💸" title="No expenses yet" sub="Track fixed costs like rent, wages, utilities and services." action={<Btn onClick={() => setShowAdd(true)}>+ Add First Expense</Btn>} />
            : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                  <Card key={e.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{e.name}</div>
                        <div style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{e.date} · <Badge color={typeColors[e.type] || C.textSub}>{e.type}</Badge> · {e.recurring}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: C.red }}>{fmtEur(e.amount)}</div>
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
function SuppliersPage({ suppliers, addSupplier }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.nif?.includes(search) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await addSupplier(form);
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });
  };

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, false), color: C.text }}>Suppliers</h1>
        <Btn onClick={() => setShowAdd(true)}>+ Add Supplier</Btn>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Input value={search} onChange={setSearch} placeholder="Search by name, NIF or category…" prefix="🔍" />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Supplier Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Empresa Lda." /></div>
          <Input label="NIF / Tax ID" value={form.nif} onChange={v => setForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Vegetables…" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="IBAN" value={form.iban} onChange={v => setForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000 0000 0000 0000 0000 0" /></div>
          <Input label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 912 345 678" />
          <Input label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="contact@supplier.pt" />
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua…" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn loading={saving} onClick={save}>Save Supplier</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🏭" title="No suppliers yet" sub="Suppliers are auto-created when you scan invoices, or add them manually." action={<Btn onClick={() => setShowAdd(true)}>+ Add Supplier</Btn>} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(s => {
              const isOpen = expandedId === s.id;
              const hasDetails = s.nif || s.iban || s.phone || s.email || s.address;
              return (
                <div key={s.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
                  {/* ── COLLAPSED ROW ── */}
                  <div onClick={() => setExpandedId(id => id === s.id ? null : s.id)}
                    style={{ display: "flex", alignItems: "center", padding: "12px 16px", cursor: "pointer", userSelect: "none" }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: C.text, flex: "0 0 auto", maxWidth: "45%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
                    <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
                      {s.category && <Badge color={C.accent}>{s.category}</Badge>}
                    </div>
                    <span style={{ fontSize: 11, color: C.textMuted, transition: "transform .2s", display: "inline-block", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}>▾</span>
                  </div>

                  {/* ── EXPANDED DETAIL ── */}
                  {isOpen && hasDetails && (
                    <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 16px", display: "flex", flexDirection: "column", gap: 7 }}>
                      {s.nif && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>NIF</span>
                          <span style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{s.nif}</span>
                        </div>
                      )}
                      {s.iban && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>IBAN</span>
                          <span style={{ fontSize: 12, color: C.text, fontFamily: "monospace", wordBreak: "break-all" }}>{s.iban}</span>
                        </div>
                      )}
                      {s.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>Phone</span>
                          <span style={{ fontSize: 13, color: C.text }}>{s.phone}</span>
                        </div>
                      )}
                      {s.email && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>Email</span>
                          <span style={{ fontSize: 13, color: C.text }}>{s.email}</span>
                        </div>
                      )}
                      {s.address && (
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, width: 52, flexShrink: 0 }}>Address</span>
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
        )}
    </div>
  );
}

// ─── INGREDIENTS PAGE ────────────────────────────────────────────────────────
function IngredientsPage({ ingredients, addIngredient, updateIngredient }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" });
  const [saving, setSaving] = useState(false);
  const [exportMsg, setExportMsg] = useState("");

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editId) {
      await updateIngredient(editId, form);
      setEditId(null);
    } else {
      await addIngredient(form);
    }
    setSaving(false);
    setShowAdd(false);
    setForm({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" });
  };

  const edit = (ing) => {
    setForm({ name: ing.name, unit: ing.unit, last_price: ing.last_price?.toString() || "", category: ing.category || "General", supplier: ing.supplier || "" });
    setEditId(ing.id);
    setShowAdd(true);
  };

  const exportCSV = () => {
    const rows = [["Name", "Unit", "Last Price (€)", "Category", "Supplier", "Last Update"]];
    ingredients.forEach(i => rows.push([i.name, i.unit, i.last_price, i.category, i.supplier, i.last_update]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ingredients.csv"; a.click();
    setExportMsg("Exported ✓");
    setTimeout(() => setExportMsg(""), 2000);
  };

  const mobileHeaders = ["Ingredient", "Unit", "Price", ""];
  const desktopHeaders = ["Ingredient", "Category", "Unit", "Last Price", "Supplier", "Last Update", ""];

  return (
    <div style={{ padding: pagePad(isMobile, w >= 768 && w < 1024), width: "100%", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: isMobile ? 16 : 24, flexWrap: "wrap", gap: 10 }}>
        <h1 style={{ margin: 0, fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, false), color: C.text }}>Ingredient Costs</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {exportMsg && <span style={{ fontSize: 12, color: C.green }}>{exportMsg}</span>}
          {!isMobile && <Btn variant="ghost" onClick={exportCSV}>📤 Export CSV</Btn>}
          <Btn onClick={() => { setEditId(null); setForm({ name: "", unit: "kg", last_price: "", category: "General", supplier: "" }); setShowAdd(true); }}>+ Add</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
        <div style={{ flex: 1 }}><Input value={search} onChange={setSearch} placeholder="Search ingredients…" prefix="🔍" /></div>
        <div style={{ fontSize: 13, color: C.textSub, whiteSpace: "nowrap" }}>{filtered.length} items</div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "Edit Ingredient" : "Add Ingredient"}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: isMobile ? "1" : "1/-1" }}><Input label="Ingredient Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Chicken breast" /></div>
          <Input label="Unit" value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))} placeholder="kg, L, un, g…" />
          <Input label="Price per unit (€)" type="number" value={form.last_price} onChange={v => setForm(p => ({ ...p, last_price: v }))} prefix="€" />
          <Input label="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Dairy, Produce…" />
          <Input label="Main Supplier" value={form.supplier} onChange={v => setForm(p => ({ ...p, supplier: v }))} placeholder="Supplier name" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Btn>
          <Btn loading={saving} onClick={save}>{editId ? "Update" : "Save"}</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🥦" title="No ingredients yet" sub="Ingredients are auto-populated when you scan supplier invoices. You can also add them manually." action={<Btn onClick={() => setShowAdd(true)}>+ Add Ingredient</Btn>} />
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
                        <button onClick={() => edit(ing)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>Edit</button>
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
  const [form, setForm] = useState({ name: "", type: "Bar/Restaurant", address: "", phone: "" });
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
          <h1 style={{ color: C.text, margin: "0 0 10px", fontSize: 22, fontWeight: 600 }}>Welcome! Let's set up your first venue.</h1>
          <p style={{ color: C.textSub, margin: 0, fontSize: 15, lineHeight: 1.6 }}>
            Before you start, add your first venue —<br />your restaurant, bar or café.
          </p>
        </div>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.textSub, marginBottom: 18, textTransform: "uppercase", letterSpacing: ".6px" }}>Create your first venue</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Input label="Venue Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="My Restaurant" />
            <Select
              label="Type"
              value={form.type}
              onChange={v => setForm(p => ({ ...p, type: v }))}
              options={["Bar/Restaurant", "Café", "Bakery", "Takeaway", "Fine Dining", "Other"].map(t => ({ value: t, label: t }))}
            />
            <Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua… (optional)" />
            <Input label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 … (optional)" />
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>⚠ {error}</div>}
          <Btn
            onClick={submit}
            loading={saving}
            style={{ width: "100%", justifyContent: "center", marginTop: 22 }}
            size="lg"
          >
            Create Venue & Get Started
          </Btn>
        </Card>
      </div>
    </div>
  );
}

// ─── SETTINGS PAGE ───────────────────────────────────────────────────────────
function SettingsPage({ venues, addVenue, deleteVenue, user, subscription, setPage }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const [showAdd, setShowAdd] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Bar/Restaurant", address: "", phone: "" });
  const [saving, setSaving] = useState(false);

  // venue delete confirmation state
  const [pendingDelete, setPendingDelete] = useState(null); // venue object | null
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
      // Delete suppliers and ingredients (not venue-linked via FK)
      await supabase.from("suppliers").delete().eq("user_id", user.id);
      await supabase.from("ingredients").delete().eq("user_id", user.id);
      await supabase.from("subscriptions").delete().eq("user_id", user.id);
      // TODO: Automate Supabase auth user deletion here once ready.
      // Options: (a) call a Vercel serverless function that uses the Supabase
      // Admin API (supabaseAdmin.auth.admin.deleteUser(user.id)), or
      // (b) create a Supabase Edge Function. For now, the auth record is
      // deleted manually from the Supabase dashboard (Authentication → Users).
      await supabase.auth.signOut();
    } catch (e) {
      setDeletingAccount(false);
      setDeleteAccountError(e.message || "Deletion failed. Please try again.");
    }
  };

  const venueLimit = subscription?.venue_limit ?? 1;
  const tier = subscription?.tier ?? "free";

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
    setForm({ name: "", type: "Bar/Restaurant", address: "", phone: "" });
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
      <h1 style={{ margin: isMobile ? "0 0 20px" : "0 0 28px", fontSize: pageTitleSize(isMobile, w >= 768 && w < 1024, false), color: C.text }}>Settings</h1>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>Account</h2>
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

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 600 }}>My Venues</h2>
          <Btn onClick={handleAddVenueClick} size="sm">+ Add Venue</Btn>
        </div>
        {venues.length === 0
          ? <EmptyState icon="🏢" title="No venues yet" sub="Add your restaurant, bar or café to organize your data by location." action={<Btn onClick={handleAddVenueClick}>+ Add First Venue</Btn>} />
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {venues.map(v => (
                <Card key={v.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{v.type} {v.address ? `· ${v.address}` : ""}</div>
                    </div>
                    <button onClick={() => { setPendingDelete(v); setDeleteError(""); }} title="Delete venue" style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>🗑</button>
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
            Cancel
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
          <Btn variant="ghost" onClick={() => setShowLimitModal(false)}>Close</Btn>
          <Btn onClick={() => { setShowLimitModal(false); setPage("pricing"); }}>⚡ Upgrade Plan</Btn>
        </div>
      </Modal>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Venue">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Input label="Venue Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="My Restaurant" />
          <Select label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))}
            options={["Bar/Restaurant", "Café", "Bakery", "Takeaway", "Fine Dining", "Other"].map(t => ({ value: t, label: t }))} />
          <Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua…" />
          <Input label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 …" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn onClick={save} loading={saving}>Add Venue</Btn>
        </div>
      </Modal>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>About</h2>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>ApexManager</strong> — Restaurant intelligence platform<br />
            AI-powered invoice scanning · Daily sales tracking · Cost analytics
          </div>
        </Card>
      </div>

      {/* ── Danger Zone ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 15, color: C.red, margin: "0 0 14px", fontWeight: 600 }}>Danger Zone</h2>
        <div style={{ border: `1px solid ${C.red}44`, borderRadius: 12, padding: "20px 24px", background: C.redDim }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 4 }}>Delete My Account</div>
              <div style={{ fontSize: 13, color: C.textSub, maxWidth: 380 }}>
                Permanently delete your account and all associated data. This action cannot be undone.
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
            <li>All suppliers and ingredients</li>
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
            Cancel
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
export default function App() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
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
  const [ingredients, setIngredients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
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
    if (!user) { setIngredients([]); return; }
    supabase.from("ingredients").select("*").eq("user_id", user.id).order("name")
      .then(({ data }) => setIngredients(data || []));
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
            scan_limit: 10,
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

  // ── Supplier helpers ─────────────────────────────────────────────────────────
  const addSupplier = async ({ name, nif, iban, address, phone, email, category }) => {
    const { data, error } = await supabase
      .from("suppliers")
      .insert({ user_id: user.id, name, nif: nif || null, iban: iban || null, address: address || null, phone: phone || null, email: email || null, category: category || null })
      .select().single();
    if (!error && data) {
      setSuppliers(prev => [...prev, data]);
      return data;
    }
    return null;
  };

  // ── Ingredient helpers ───────────────────────────────────────────────────────
  const addIngredient = async ({ name, unit, last_price, category, supplier }) => {
    const price = parseFloat(last_price) || 0;
    const { data, error } = await supabase
      .from("ingredients")
      .insert({ user_id: user.id, name, unit, last_price: price, category: category || "General", supplier: supplier || null, last_update: today(), price_history: [{ date: today(), price }] })
      .select().single();
    if (!error && data) setIngredients(prev => [...prev, data]);
    return error ? null : data;
  };

  const updateIngredient = async (id, { name, unit, last_price, category, supplier }) => {
    const price = parseFloat(last_price) || 0;
    const existing = ingredients.find(i => i.id === id);
    const price_history = [...(existing?.price_history || []), { date: today(), price }];
    const { data, error } = await supabase
      .from("ingredients")
      .update({ name, unit, last_price: price, category, supplier: supplier || null, last_update: today(), price_history })
      .eq("id", id).select().single();
    if (!error && data) setIngredients(prev => prev.map(i => i.id === id ? data : i));
  };

  const upsertIngredient = async ({ name, unit, last_price, supplier }) => {
    const existing = ingredients.find(i => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      await updateIngredient(existing.id, { name: existing.name, unit, last_price, category: existing.category || "General", supplier });
    } else {
      await addIngredient({ name, unit, last_price, category: "General", supplier });
    }
  };

  // ── Staff helpers ────────────────────────────────────────────────────────────
  const addStaff = async (payload) => {
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
    if (venueId === id) setVenueId("");
    return { error: null };
  };

  const venue = venues.find(v => v.id === venueId) || null;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleVenueChange = (id) => setVenueId(id);

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
      input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
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

  const pageProps = { venues, sales, expenses, invoices, suppliers, ingredients, staff, venue };

  return (
    <div style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>
      {globalStyles}

      {/* Desktop sidebar */}
      {!isMobile && (
        <Sidebar page={page} setPage={setPage} venue={venue} venues={venues} onVenueChange={handleVenueChange} user={user} onLogout={handleLogout} subscription={subscription} />
      )}

      {/* Mobile: fixed top header */}
      {isMobile && (
        <MobileHeader page={page} onOpenDrawer={() => setDrawerOpen(true)} venue={venue} />
      )}

      {/* Mobile: slide-in drawer — always rendered, visibility controlled via CSS transform */}
      {isMobile && (
        <NavDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} page={page} setPage={setPage} venue={venue} venues={venues} onVenueChange={handleVenueChange} user={user} onLogout={handleLogout} subscription={subscription} />
      )}

      <main style={{ flex: 1, minWidth: 0, overflowY: "auto", overflowX: "hidden", height: "100vh", WebkitOverflowScrolling: "touch", paddingTop: isMobile ? 56 : 0, paddingBottom: isMobile ? "calc(60px + env(safe-area-inset-bottom))" : 0, maxWidth: isMobile ? undefined : "calc(100vw - 220px)" }}>
        <div key={page} style={{ animation: "fadeIn .18s ease", width: "100%", boxSizing: "border-box" }}>
          {page === "dashboard" && <DashboardPage {...pageProps} subscription={subscription} setPage={setPage} setInvoicesInitialFilter={setInvoicesInitialFilter} />}
          {page === "sales" && <SalesPage sales={sales} addSale={addSale} updateSale={updateSale} deleteSale={deleteSale} salesLoading={salesLoading} venues={venues} venue={venue} subscription={subscription} setSubscription={setSubscription} staffList={staff} />}
          {page === "invoices" && <InvoicesPage invoices={invoices} addInvoice={addInvoice} updateInvoice={updateInvoice} markInvoicePaid={markInvoicePaid} suppliers={suppliers} addSupplier={addSupplier} upsertIngredient={upsertIngredient} venue={venue} subscription={subscription} setSubscription={setSubscription} initialStatusFilter={invoicesInitialFilter} />}
          {page === "expenses" && <ExpensesPage expenses={expenses} addExpense={addExpense} deleteExpense={deleteExpense} venue={venue} />}
          {page === "suppliers" && <SuppliersPage suppliers={suppliers} addSupplier={addSupplier} />}
          {page === "ingredients" && <IngredientsPage ingredients={ingredients} addIngredient={addIngredient} updateIngredient={updateIngredient} />}
          {page === "staff" && <StaffPage staff={staff} addStaff={addStaff} updateStaff={updateStaff} deleteStaff={deleteStaff} venue={venue} />}
          {page === "analytics" && <AnalyticsPage sales={sales} expenses={expenses} invoices={invoices} venues={venues} staff={staff} suppliers={suppliers} ingredients={ingredients} />}
          {page === "settings" && <SettingsPage venues={venues} addVenue={addVenue} deleteVenue={deleteVenue} user={user} subscription={subscription} setPage={setPage} />}
          {page === "pricing" && <PricingPage user={user} subscription={subscription} />}
        </div>
      </main>

      {/* Mobile: fixed bottom nav */}
      {isMobile && <BottomNav page={page} setPage={setPage} onOpenDrawer={() => setDrawerOpen(true)} />}
    </div>
  );
}
