import { useState, useEffect, useRef, useCallback } from "react";

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

// ─── CLAUDE API ──────────────────────────────────────────────────────────────
async function callClaude(messages, systemPrompt, imageBase64 = null, imageType = "image/jpeg") {
  const userContent = imageBase64
    ? [
        { type: "image", source: { type: "base64", media_type: imageType, data: imageBase64 } },
        { type: "text", text: messages[messages.length - 1].content }
      ]
    : messages[messages.length - 1].content;

  const payload = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      ...messages.slice(0, -1),
      { role: "user", content: userContent }
    ]
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "";
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
  return <span style={{ background: color + "22", color, padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600, letterSpacing: ".4px" }}>{children}</span>;
}

function Btn({ onClick, disabled, loading, variant = "primary", size = "md", children, style = {} }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 10, fontWeight: 600, cursor: disabled || loading ? "not-allowed" : "pointer", border: "none", transition: "all .15s", opacity: disabled || loading ? 0.5 : 1 };
  const sizes = { sm: { padding: "6px 14px", fontSize: 12 }, md: { padding: "10px 20px", fontSize: 13 }, lg: { padding: "13px 28px", fontSize: 14 } };
  const variants = {
    primary: { background: C.accent, color: "#fff" },
    ghost: { background: "transparent", color: C.textSub, border: `1px solid ${C.border}` },
    danger: { background: C.redDim, color: C.red, border: `1px solid ${C.red}44` },
    green: { background: C.greenDim, color: C.green, border: `1px solid ${C.green}44` },
  };
  return (
    <button onClick={!disabled && !loading ? onClick : undefined} style={{ ...base, ...sizes[size], ...variants[variant], ...style }}>
      {loading ? <Spinner size={14} /> : null}{children}
    </button>
  );
}

function Card({ children, style = {}, onClick }) {
  return (
    <div onClick={onClick} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, ...style, cursor: onClick ? "pointer" : undefined, transition: "border-color .15s" }}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = C.accent)}
      onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = C.border)}>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, prefix, style = {}, disabled }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "center", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
        {prefix && <span style={{ padding: "0 10px", color: C.textSub, fontSize: 13 }}>{prefix}</span>}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          disabled={disabled}
          style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 14, padding: "10px 12px", fontFamily: "inherit", ...style }} />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, style = {} }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: C.textSub, fontWeight: 500 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 9, color: C.text, fontSize: 14, padding: "10px 12px", outline: "none", fontFamily: "inherit", ...style }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, width = 540 }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000a", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: C.text }}>{title}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color = C.accent, icon }) {
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: color, marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 22, opacity: .7 }}>{icon}</div>}
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

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [users, setUsers] = useStore("apex_users", []);

  const login = () => {
    const u = users.find(u => u.email === email && u.password === password);
    if (!u) return setError("Invalid email or password.");
    onLogin(u);
  };

  const register = () => {
    if (!name || !email || !password) return setError("Please fill all fields.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (users.find(u => u.email === email)) return setError("Email already registered.");
    const u = { id: uid(), email, password, name, createdAt: Date.now() };
    setUsers(prev => [...prev, u]);
    onLogin(u);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 36 }}>🍽️</div>
          <h1 style={{ color: C.text, margin: "10px 0 4px", fontSize: 26, fontWeight: 700 }}>ApexManager</h1>
          <p style={{ color: C.textSub, margin: 0, fontSize: 14 }}>Restaurant intelligence platform</p>
        </div>
        <Card>
          <div style={{ display: "flex", marginBottom: 24, gap: 8 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, background: mode === m ? C.accent : C.surfaceL, color: mode === m ? "#fff" : C.textSub, transition: "all .15s" }}>
                {m === "login" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && <Input label="Full Name" value={name} onChange={setName} placeholder="João Silva" />}
            <Input label="Email" value={email} onChange={setEmail} type="email" placeholder="you@restaurant.com" />
            <Input label="Password" value={password} onChange={setPassword} type="password" placeholder="••••••••" />
          </div>
          {error && <div style={{ color: C.red, fontSize: 12, marginTop: 12 }}>⚠ {error}</div>}
          <Btn onClick={mode === "login" ? login : register} style={{ width: "100%", justifyContent: "center", marginTop: 20 }} size="lg">
            {mode === "login" ? "Sign In" : "Create Account"}
          </Btn>
          {mode === "login" && (
            <div style={{ marginTop: 16, padding: "12px 14px", background: C.accentDim, borderRadius: 9, fontSize: 12, color: C.textSub }}>
              <strong style={{ color: C.accent }}>Demo:</strong> Register a new account to get started. All data is stored locally.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// ─── SIDEBAR NAV ─────────────────────────────────────────────────────────────
function Sidebar({ page, setPage, venue, venues, onVenueChange, user, onLogout }) {
  const navItems = [
    { id: "dashboard", icon: "📊", label: "Dashboard" },
    { id: "sales", icon: "💳", label: "Daily Sales" },
    { id: "invoices", icon: "🧾", label: "Invoices" },
    { id: "expenses", icon: "💸", label: "Expenses" },
    { id: "suppliers", icon: "🏭", label: "Suppliers" },
    { id: "ingredients", icon: "🥦", label: "Ingredients" },
    { id: "analytics", icon: "📈", label: "Analytics" },
    { id: "settings", icon: "⚙️", label: "Settings" },
  ];

  return (
    <div style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", height: "100vh", position: "sticky", top: 0, flexShrink: 0 }}>
      <div style={{ padding: "20px 16px", borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>🍽️ ApexManager</div>
        <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{user?.name}</div>
      </div>
      {venues.length > 0 && (
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Venue</div>
          <select value={venue?.id || ""} onChange={e => onVenueChange(e.target.value)}
            style={{ width: "100%", background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 7, color: C.text, fontSize: 12, padding: "6px 8px", outline: "none", fontFamily: "inherit" }}>
            <option value="">All Venues</option>
            {venues.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
      )}
      <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
        {navItems.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", textAlign: "left", background: page === n.id ? C.accentDim : "transparent", color: page === n.id ? C.accent : C.textSub, fontWeight: page === n.id ? 600 : 400, fontSize: 13, transition: "all .12s" }}>
            <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}` }}>
        <button onClick={onLogout} style={{ background: "none", border: "none", color: C.textSub, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>🚪 Sign Out</button>
      </div>
    </div>
  );
}

// ─── DASHBOARD PAGE ──────────────────────────────────────────────────────────
function DashboardPage({ venues, sales, expenses, invoices }) {
  const [range, setRange] = useState("month");
  const venueIds = venues.map(v => v.id);

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
  const totalDailyCosts = filtered.reduce((a, s) => a + (s.cashExpenses || 0), 0);
  const totalFixedExp = expenses.reduce((a, e) => a + (e.amount || 0), 0);
  const totalInvoices = invoices.reduce((a, i) => a + (i.total || 0), 0);

  // Last 8 weeks mini chart
  const weekData = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (7 * (7 - i)));
    const label = `W${8 - i}`;
    const value = sales.filter(s => { const sd = new Date(s.date); return (d - sd) / 86400000 <= 7 && (d - sd) >= 0; }).reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
    return { label, value };
  });

  const profit = totalSales - totalDailyCosts - totalFixedExp;

  const ranges = [{ v: "week", l: "7 Days" }, { v: "month", l: "This Month" }, { v: "year", l: "This Year" }, { v: "all", l: "All Time" }];

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Sales Dashboard</h1>
        <div style={{ display: "flex", gap: 6 }}>
          {ranges.map(r => (
            <button key={r.v} onClick={() => setRange(r.v)}
              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${range === r.v ? C.accent : C.border}`, background: range === r.v ? C.accentDim : "transparent", color: range === r.v ? C.accent : C.textSub, fontSize: 12, cursor: "pointer", fontWeight: range === r.v ? 600 : 400 }}>
              {r.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total Revenue" value={fmtEur(totalSales)} sub={`${filtered.length} days`} color={C.green} icon="💰" />
        <MetricCard label="Cash Sales" value={fmtEur(totalCash)} sub={`${totalSales ? ((totalCash / totalSales) * 100).toFixed(1) : 0}% of total`} color={C.amber} icon="💵" />
        <MetricCard label="Card Sales" value={fmtEur(totalCard)} sub={`${totalSales ? ((totalCard / totalSales) * 100).toFixed(1) : 0}% of total`} color={C.blue} icon="💳" />
        <MetricCard label="Est. Profit" value={fmtEur(profit)} sub={totalSales ? `${((profit / totalSales) * 100).toFixed(1)}% margin` : "—"} color={profit >= 0 ? C.green : C.red} icon="📈" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14, fontWeight: 600 }}>Weekly Revenue Trend</div>
          <MiniBar data={weekData} color={C.accent} height={80} />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {weekData.map((d, i) => <span key={i} style={{ fontSize: 10, color: C.textMuted }}>{d.label}</span>)}
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14, fontWeight: 600 }}>Cost Breakdown</div>
          {[
            { l: "Daily Expenses", v: totalDailyCosts, c: C.amber },
            { l: "Fixed Costs", v: totalFixedExp, c: C.red },
            { l: "Supplier Invoices", v: totalInvoices, c: C.blue },
          ].map(r => (
            <div key={r.l} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ fontSize: 12, color: C.textSub }}>{r.l}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: r.c }}>{fmtEur(r.v)}</span>
            </div>
          ))}
        </Card>
      </div>

      {filtered.length === 0 && (
        <EmptyState icon="📊" title="No data for this period" sub="Add daily sales logs to see your dashboard come to life." />
      )}

      {filtered.length > 0 && (
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, marginBottom: 14, fontWeight: 600 }}>Recent Sales Logs</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>{["Date", "Cash", "Card", "Total", "Daily Costs", "Staff"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: C.textMuted, fontWeight: 500, borderBottom: `1px solid ${C.border}`, fontSize: 11 }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10).map(s => (
                <tr key={s.id}>
                  <td style={{ padding: "9px 12px", color: C.textSub }}>{s.date}</td>
                  <td style={{ padding: "9px 12px", color: C.amber }}>{fmtEur(s.cash || 0)}</td>
                  <td style={{ padding: "9px 12px", color: C.blue }}>{fmtEur(s.card || 0)}</td>
                  <td style={{ padding: "9px 12px", color: C.text, fontWeight: 600 }}>{fmtEur((s.cash || 0) + (s.card || 0))}</td>
                  <td style={{ padding: "9px 12px", color: C.red }}>{fmtEur(s.cashExpenses || 0)}</td>
                  <td style={{ padding: "9px 12px", color: C.textSub, fontSize: 12 }}>{(s.staff || []).join(", ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ─── DAILY SALES PAGE ────────────────────────────────────────────────────────
function SalesPage({ sales, setSales, venues, venue }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: today(), cash: "", card: "", cashExpenses: "", xpto: "", pos: "", note: "", staff: [] });
  const [scanMode, setScanMode] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [staffInput, setStaffInput] = useState("");

  const filtered = venue ? sales.filter(s => s.venueId === venue.id) : sales;

  const save = () => {
    const s = { id: uid(), venueId: venue?.id || null, venueName: venue?.name || "All", ...form, cash: parseFloat(form.cash) || 0, card: parseFloat(form.card) || 0, cashExpenses: parseFloat(form.cashExpenses) || 0, xpto: parseFloat(form.xpto) || 0, pos: parseFloat(form.pos) || 0, createdAt: Date.now() };
    setSales(prev => [...prev, s]);
    setShowAdd(false);
    setForm({ date: today(), cash: "", card: "", cashExpenses: "", xpto: "", pos: "", note: "", staff: [] });
  };

  const scanReceipt = async (file) => {
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
    } catch (e) {
      alert("Could not parse receipt. Please fill in manually.");
    }
    setScanLoading(false);
  };

  const addStaff = () => {
    if (staffInput.trim() && !form.staff.includes(staffInput.trim())) {
      setForm(prev => ({ ...prev, staff: [...prev.staff, staffInput.trim()] }));
      setStaffInput("");
    }
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Daily Sales Log</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => { setScanMode(true); setShowAdd(true); }}>📷 Scan Receipt</Btn>
          <Btn onClick={() => { setScanMode(false); setShowAdd(true); }}>+ Add Entry</Btn>
        </div>
      </div>

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} /></div>
          <Input label="Cash Sales (€)" type="number" value={form.cash} onChange={v => setForm(p => ({ ...p, cash: v }))} placeholder="0.00" prefix="€" />
          <Input label="Card Sales (€)" type="number" value={form.card} onChange={v => setForm(p => ({ ...p, card: v }))} placeholder="0.00" prefix="€" />
          <Input label="Cash Expenses (€)" type="number" value={form.cashExpenses} onChange={v => setForm(p => ({ ...p, cashExpenses: v }))} placeholder="0.00" prefix="€" />
          <Input label="XPTO / Other (€)" type="number" value={form.xpto} onChange={v => setForm(p => ({ ...p, xpto: v }))} placeholder="0.00" prefix="€" />
          <Input label="POS Report (€)" type="number" value={form.pos} onChange={v => setForm(p => ({ ...p, pos: v }))} placeholder="0.00" prefix="€" />
          <div style={{ gridColumn: "1/-1" }}>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 6 }}>Staff Attendance</div>
            <div style={{ display: "flex", gap: 6 }}>
              <Input value={staffInput} onChange={setStaffInput} placeholder="Staff name" style={{ flex: 1 }} />
              <Btn variant="ghost" onClick={addStaff} size="sm">Add</Btn>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {form.staff.map(s => (
                <span key={s} style={{ background: C.accentDim, color: C.accent, padding: "3px 10px", borderRadius: 99, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  {s} <button onClick={() => setForm(p => ({ ...p, staff: p.staff.filter(x => x !== s) }))} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          </div>
          <div style={{ gridColumn: "1/-1" }}><Input label="Notes" value={form.note} onChange={v => setForm(p => ({ ...p, note: v }))} placeholder="Optional notes…" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn onClick={save}>Save Entry</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="💳" title="No sales entries yet" sub="Log your daily sales manually or scan a receipt with AI." action={<Btn onClick={() => setShowAdd(true)}>+ Add First Entry</Btn>} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(s => {
              const total = (s.cash || 0) + (s.card || 0);
              return (
                <Card key={s.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.date}</div>
                      <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>{s.venueName} {s.staff?.length ? `• ${s.staff.join(", ")}` : ""}</div>
                      {s.note && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3, fontStyle: "italic" }}>{s.note}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>{fmtEur(total)}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>
                        <span style={{ color: C.amber }}>Cash {fmtEur(s.cash || 0)}</span> · <span style={{ color: C.blue }}>Card {fmtEur(s.card || 0)}</span>
                      </div>
                      {(s.cashExpenses > 0) && <div style={{ fontSize: 12, color: C.red }}>Costs −{fmtEur(s.cashExpenses)}</div>}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── INVOICES PAGE ───────────────────────────────────────────────────────────
function InvoicesPage({ invoices, setInvoices, suppliers, setSuppliers, setIngredients, venue }) {
  const [showScan, setShowScan] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [extracted, setExtracted] = useState(null);
  const [editItems, setEditItems] = useState([]);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ supplier: "", date: today(), subtotal: "", tax: "", total: "", iban: "", nif: "" });

  const filtered = venue ? invoices.filter(i => i.venueId === venue.id) : invoices;

  const scanInvoice = async (file) => {
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
    } catch (e) {
      setScanLoading(false);
      alert("Could not parse invoice. Try manual entry.");
    }
  };

  const saveExtracted = () => {
    if (!extracted) return;
    const supplierId = uid();
    const newSupplier = {
      id: supplierId, name: extracted.supplierName || "Unknown", nif: extracted.supplierNIF || "",
      iban: extracted.supplierIBAN || "", address: extracted.supplierAddress || "", phone: extracted.supplierPhone || "",
      createdAt: Date.now()
    };
    setSuppliers(prev => {
      const exists = prev.find(s => s.nif && s.nif === newSupplier.nif);
      return exists ? prev : [...prev, newSupplier];
    });

    const invoice = {
      id: uid(), venueId: venue?.id || null, venueName: venue?.name || "All",
      supplierId: supplierId, supplierName: extracted.supplierName || "Unknown",
      date: extracted.date || today(), invoiceNumber: extracted.invoiceNumber || "",
      items: editItems, subtotal: extracted.subtotal || 0, tax: extracted.tax || 0,
      taxRate: extracted.taxRate || 0, total: extracted.total || 0, currency: "EUR",
      createdAt: Date.now()
    };
    setInvoices(prev => [...prev, invoice]);

    // Update ingredient costs
    editItems.forEach(item => {
      setIngredients(prev => {
        const exists = prev.find(i => i.name.toLowerCase() === item.name.toLowerCase());
        if (exists) {
          return prev.map(i => i.name.toLowerCase() === item.name.toLowerCase()
            ? { ...i, lastPrice: item.unitPrice, lastUpdate: today(), unit: item.unit }
            : i);
        } else {
          return [...prev, { id: uid(), name: item.name, unit: item.unit || "un", lastPrice: item.unitPrice, category: "General", supplier: extracted.supplierName || "", lastUpdate: today(), history: [{ date: today(), price: item.unitPrice }] }];
        }
      });
    });

    setExtracted(null); setEditItems([]); setShowScan(false);
  };

  const saveManual = () => {
    const invoice = {
      id: uid(), venueId: venue?.id || null, venueName: venue?.name || "All",
      supplierId: null, supplierName: manualForm.supplier,
      date: manualForm.date, invoiceNumber: "",
      items: [], subtotal: parseFloat(manualForm.subtotal) || 0,
      tax: parseFloat(manualForm.tax) || 0, total: parseFloat(manualForm.total) || 0,
      currency: "EUR", createdAt: Date.now(), iban: manualForm.iban, nif: manualForm.nif
    };
    setInvoices(prev => [...prev, invoice]);
    setShowManual(false);
    setManualForm({ supplier: "", date: today(), subtotal: "", tax: "", total: "", iban: "", nif: "" });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Supplier Invoices</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn variant="ghost" onClick={() => setShowManual(true)}>+ Manual Entry</Btn>
          <Btn onClick={() => setShowScan(true)}>📷 Scan Invoice</Btn>
        </div>
      </div>

      {/* SCAN MODAL */}
      <Modal open={showScan} onClose={() => { setShowScan(false); setExtracted(null); setEditItems([]); }} title="Scan Supplier Invoice" width={700}>
        {!extracted ? (
          <UploadZone onFile={scanInvoice} loading={scanLoading} label="Upload photo or PDF of supplier invoice" />
        ) : (
          <div>
            <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 9, padding: 12, marginBottom: 16, fontSize: 13, color: C.green }}>✓ Invoice extracted. Review before saving.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div><div style={{ fontSize: 11, color: C.textSub }}>Supplier</div><div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{extracted.supplierName || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>NIF / Tax ID</div><div style={{ fontSize: 14, color: C.text }}>{extracted.supplierNIF || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>IBAN</div><div style={{ fontSize: 14, color: C.text, fontFamily: "monospace" }}>{extracted.supplierIBAN || "—"}</div></div>
              <div><div style={{ fontSize: 11, color: C.textSub }}>Date</div><div style={{ fontSize: 14, color: C.text }}>{extracted.date || "—"}</div></div>
            </div>
            <div style={{ fontSize: 12, color: C.textSub, fontWeight: 600, marginBottom: 8 }}>LINE ITEMS</div>
            <div style={{ border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
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
              <Btn variant="green" onClick={saveExtracted}>✓ Save Invoice & Update Costs</Btn>
            </div>
          </div>
        )}
      </Modal>

      {/* MANUAL ENTRY MODAL */}
      <Modal open={showManual} onClose={() => setShowManual(false)} title="Manual Invoice Entry">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Supplier Name" value={manualForm.supplier} onChange={v => setManualForm(p => ({ ...p, supplier: v }))} placeholder="Supplier name" /></div>
          <Input label="Date" type="date" value={manualForm.date} onChange={v => setManualForm(p => ({ ...p, date: v }))} />
          <Input label="NIF / Tax ID" value={manualForm.nif} onChange={v => setManualForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label="Subtotal (€)" type="number" value={manualForm.subtotal} onChange={v => setManualForm(p => ({ ...p, subtotal: v }))} prefix="€" />
          <Input label="Tax (€)" type="number" value={manualForm.tax} onChange={v => setManualForm(p => ({ ...p, tax: v }))} prefix="€" />
          <div style={{ gridColumn: "1/-1" }}><Input label="Total (€)" type="number" value={manualForm.total} onChange={v => setManualForm(p => ({ ...p, total: v }))} prefix="€" /></div>
          <div style={{ gridColumn: "1/-1" }}><Input label="IBAN" value={manualForm.iban} onChange={v => setManualForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000 0000 0000 0000 0000 0" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowManual(false)}>Cancel</Btn>
          <Btn onClick={saveManual}>Save Invoice</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🧾" title="No invoices yet" sub="Scan a supplier invoice with AI to automatically extract items, prices, taxes and supplier data." action={<Btn onClick={() => setShowScan(true)}>📷 Scan First Invoice</Btn>} />
        : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(inv => (
              <Card key={inv.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{inv.supplierName}</div>
                    <div style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>
                      {inv.date} {inv.invoiceNumber ? `· #${inv.invoiceNumber}` : ""}
                      {inv.nif ? ` · NIF: ${inv.nif}` : ""}
                    </div>
                    {inv.items && inv.items.length > 0 && (
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{inv.items.length} item{inv.items.length !== 1 ? "s" : ""}: {inv.items.slice(0, 3).map(i => i.name).join(", ")}{inv.items.length > 3 ? "…" : ""}</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{fmtEur(inv.total)}</div>
                    {inv.tax > 0 && <div style={{ fontSize: 12, color: C.textSub }}>Tax: {fmtEur(inv.tax)}</div>}
                    <Badge color={C.accent}>Invoice</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── EXPENSES PAGE ───────────────────────────────────────────────────────────
function ExpensesPage({ expenses, setExpenses, venue }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
  const [filter, setFilter] = useState("ALL");

  const filtered = (venue ? expenses.filter(e => e.venueId === venue.id) : expenses).filter(e => filter === "ALL" || e.type === filter);

  const types = ["SERVICES", "WAGES", "INVOICES", "RENT", "OTHER"];
  const typeColors = { SERVICES: C.blue, WAGES: C.amber, INVOICES: C.accent, RENT: C.red, OTHER: C.textSub };

  const save = () => {
    setExpenses(prev => [...prev, { id: uid(), venueId: venue?.id || null, venueName: venue?.name || "All", ...form, amount: parseFloat(form.amount) || 0, createdAt: Date.now() }]);
    setShowAdd(false);
    setForm({ name: "", amount: "", type: "OTHER", recurring: "ONE_TIME", date: today() });
  };

  const total = filtered.reduce((a, e) => a + e.amount, 0);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Expenses</h1>
        <Btn onClick={() => setShowAdd(true)}>+ Add Expense</Btn>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {["ALL", ...types].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            style={{ padding: "5px 13px", borderRadius: 99, border: `1px solid ${filter === t ? (typeColors[t] || C.accent) : C.border}`, background: filter === t ? (typeColors[t] + "22" || C.accentDim) : "transparent", color: filter === t ? (typeColors[t] || C.accent) : C.textSub, fontSize: 12, cursor: "pointer", fontWeight: filter === t ? 600 : 400 }}>
            {t}
          </button>
        ))}
        <div style={{ marginLeft: "auto", fontSize: 13, color: C.text, display: "flex", alignItems: "center" }}>Total: <strong style={{ marginLeft: 6, color: C.red }}>{fmtEur(total)}</strong></div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Expense">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Expense Name" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Electricity bill" /></div>
          <Input label="Amount (€)" type="number" value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} prefix="€" />
          <Input label="Date" type="date" value={form.date} onChange={v => setForm(p => ({ ...p, date: v }))} />
          <Select label="Type" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} options={types.map(t => ({ value: t, label: t }))} />
          <Select label="Recurring" value={form.recurring} onChange={v => setForm(p => ({ ...p, recurring: v }))}
            options={[{ value: "ONE_TIME", label: "One Time" }, { value: "WEEKLY", label: "Weekly" }, { value: "MONTHLY", label: "Monthly" }, { value: "ANNUALLY", label: "Annually" }]} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn onClick={save}>Save Expense</Btn>
        </div>
      </Modal>

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
                    <button onClick={() => setExpenses(prev => prev.filter(x => x.id !== e.id))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>🗑</button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
}

// ─── SUPPLIERS PAGE ──────────────────────────────────────────────────────────
function SuppliersPage({ suppliers, setSuppliers, invoices }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.nif?.includes(search));

  const save = () => {
    setSuppliers(prev => [...prev, { id: uid(), ...form, createdAt: Date.now() }]);
    setShowAdd(false);
    setForm({ name: "", nif: "", iban: "", address: "", phone: "", email: "", category: "" });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Suppliers</h1>
        <Btn onClick={() => setShowAdd(true)}>+ Add Supplier</Btn>
      </div>

      <div style={{ marginBottom: 18 }}>
        <Input value={search} onChange={setSearch} placeholder="Search by name or NIF…" prefix="🔍" />
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Supplier">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Supplier Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="Empresa Lda." /></div>
          <Input label="NIF / Tax ID" value={form.nif} onChange={v => setForm(p => ({ ...p, nif: v }))} placeholder="PT123456789" />
          <Input label="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Vegetables…" />
          <div style={{ gridColumn: "1/-1" }}><Input label="IBAN" value={form.iban} onChange={v => setForm(p => ({ ...p, iban: v }))} placeholder="PT50 0000 0000 0000 0000 0000 0" /></div>
          <Input label="Phone" value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} placeholder="+351 912 345 678" />
          <Input label="Email" type="email" value={form.email} onChange={v => setForm(p => ({ ...p, email: v }))} placeholder="contact@supplier.pt" />
          <div style={{ gridColumn: "1/-1" }}><Input label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} placeholder="Rua…" /></div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Btn>
          <Btn onClick={save}>Save Supplier</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🏭" title="No suppliers yet" sub="Suppliers are auto-created when you scan invoices, or add them manually." action={<Btn onClick={() => setShowAdd(true)}>+ Add Supplier</Btn>} />
        : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {filtered.map(s => {
              const supInvoices = invoices.filter(i => i.supplierName === s.name);
              const totalSpend = supInvoices.reduce((a, i) => a + (i.total || 0), 0);
              return (
                <Card key={s.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{s.name}</div>
                      {s.category && <Badge color={C.accent}>{s.category}</Badge>}
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                        {s.nif && <div style={{ fontSize: 12, color: C.textSub }}>NIF: <span style={{ color: C.text }}>{s.nif}</span></div>}
                        {s.iban && <div style={{ fontSize: 11, color: C.textSub, fontFamily: "monospace" }}>IBAN: {s.iban}</div>}
                        {s.phone && <div style={{ fontSize: 12, color: C.textSub }}>📞 {s.phone}</div>}
                        {s.email && <div style={{ fontSize: 12, color: C.textSub }}>✉ {s.email}</div>}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{supInvoices.length} invoice{supInvoices.length !== 1 ? "s" : ""}</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.amber, marginTop: 4 }}>{fmtEur(totalSpend)}</div>
                      <div style={{ fontSize: 10, color: C.textMuted }}>total spend</div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
    </div>
  );
}

// ─── INGREDIENTS PAGE ────────────────────────────────────────────────────────
function IngredientsPage({ ingredients, setIngredients }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "kg", lastPrice: "", category: "General", supplier: "" });
  const [exportMsg, setExportMsg] = useState("");

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category?.toLowerCase().includes(search.toLowerCase()));

  const save = () => {
    if (editId) {
      setIngredients(prev => prev.map(i => i.id === editId ? { ...i, ...form, lastPrice: parseFloat(form.lastPrice) || 0 } : i));
      setEditId(null);
    } else {
      setIngredients(prev => [...prev, { id: uid(), ...form, lastPrice: parseFloat(form.lastPrice) || 0, lastUpdate: today(), history: [{ date: today(), price: parseFloat(form.lastPrice) || 0 }] }]);
    }
    setShowAdd(false);
    setForm({ name: "", unit: "kg", lastPrice: "", category: "General", supplier: "" });
  };

  const edit = (ing) => {
    setForm({ name: ing.name, unit: ing.unit, lastPrice: ing.lastPrice?.toString() || "", category: ing.category || "General", supplier: ing.supplier || "" });
    setEditId(ing.id);
    setShowAdd(true);
  };

  const exportCSV = () => {
    const rows = [["Name", "Unit", "Last Price (€)", "Category", "Supplier", "Last Update"]];
    ingredients.forEach(i => rows.push([i.name, i.unit, i.lastPrice, i.category, i.supplier, i.lastUpdate]));
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ingredients.csv"; a.click();
    setExportMsg("Exported ✓");
    setTimeout(() => setExportMsg(""), 2000);
  };

  const categories = [...new Set(ingredients.map(i => i.category))].filter(Boolean);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1000 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Ingredient Costs</h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {exportMsg && <span style={{ fontSize: 12, color: C.green }}>{exportMsg}</span>}
          <Btn variant="ghost" onClick={exportCSV}>📤 Export CSV</Btn>
          <Btn onClick={() => { setEditId(null); setForm({ name: "", unit: "kg", lastPrice: "", category: "General", supplier: "" }); setShowAdd(true); }}>+ Add Ingredient</Btn>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center" }}>
        <div style={{ flex: 1 }}><Input value={search} onChange={setSearch} placeholder="Search ingredients…" prefix="🔍" /></div>
        <div style={{ fontSize: 13, color: C.textSub }}>{filtered.length} items</div>
      </div>

      <Modal open={showAdd} onClose={() => { setShowAdd(false); setEditId(null); }} title={editId ? "Edit Ingredient" : "Add Ingredient"}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}><Input label="Ingredient Name *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="e.g. Chicken breast" /></div>
          <Input label="Unit" value={form.unit} onChange={v => setForm(p => ({ ...p, unit: v }))} placeholder="kg, L, un, g…" />
          <Input label="Price per unit (€)" type="number" value={form.lastPrice} onChange={v => setForm(p => ({ ...p, lastPrice: v }))} prefix="€" />
          <Input label="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))} placeholder="Meat, Dairy, Produce…" />
          <Input label="Main Supplier" value={form.supplier} onChange={v => setForm(p => ({ ...p, supplier: v }))} placeholder="Supplier name" />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
          <Btn variant="ghost" onClick={() => { setShowAdd(false); setEditId(null); }}>Cancel</Btn>
          <Btn onClick={save}>{editId ? "Update" : "Save"}</Btn>
        </div>
      </Modal>

      {filtered.length === 0
        ? <EmptyState icon="🥦" title="No ingredients yet" sub="Ingredients are auto-populated when you scan supplier invoices. You can also add them manually." action={<Btn onClick={() => setShowAdd(true)}>+ Add Ingredient</Btn>} />
        : (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: C.surfaceL }}>
                  {["Ingredient", "Category", "Unit", "Last Price", "Supplier", "Last Update", ""].map(h => (
                    <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: C.textMuted, fontWeight: 500, fontSize: 11, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(ing => (
                  <tr key={ing.id} style={{ borderBottom: `1px solid ${C.border}` }}
                    onMouseEnter={e => e.currentTarget.style.background = C.surfaceL}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ padding: "10px 14px", color: C.text, fontWeight: 500 }}>{ing.name}</td>
                    <td style={{ padding: "10px 14px" }}><Badge color={C.accent}>{ing.category}</Badge></td>
                    <td style={{ padding: "10px 14px", color: C.textSub }}>{ing.unit}</td>
                    <td style={{ padding: "10px 14px", color: C.amber, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtEur(ing.lastPrice || 0)}</td>
                    <td style={{ padding: "10px 14px", color: C.textSub, fontSize: 12 }}>{ing.supplier || "—"}</td>
                    <td style={{ padding: "10px 14px", color: C.textMuted, fontSize: 12 }}>{ing.lastUpdate || "—"}</td>
                    <td style={{ padding: "10px 14px" }}>
                      <button onClick={() => edit(ing)} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 13 }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
    </div>
  );
}

// ─── ANALYTICS PAGE ──────────────────────────────────────────────────────────
function AnalyticsPage({ sales, expenses, invoices, venues }) {
  const [from, setFrom] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split("T")[0]; });
  const [to, setTo] = useState(today);
  const [venueId, setVenueId] = useState("");

  const inRange = (s) => s.date >= from && s.date <= to && (!venueId || s.venueId === venueId);
  const filteredSales = sales.filter(inRange);
  const filteredExp = expenses.filter(e => e.date >= from && e.date <= to && (!venueId || e.venueId === venueId));
  const filteredInv = invoices.filter(i => i.date >= from && i.date <= to && (!venueId || i.venueId === venueId));

  const totalSales = filteredSales.reduce((a, s) => a + (s.cash || 0) + (s.card || 0), 0);
  const totalExp = filteredExp.reduce((a, e) => a + (e.amount || 0), 0);
  const totalInv = filteredInv.reduce((a, i) => a + (i.total || 0), 0);
  const dailyCosts = filteredSales.reduce((a, s) => a + (s.cashExpenses || 0), 0);
  const profit = totalSales - totalExp - totalInv - dailyCosts;

  // Daily breakdown
  const dailyData = filteredSales.reduce((acc, s) => {
    const d = s.date;
    if (!acc[d]) acc[d] = { date: d, total: 0, cash: 0, card: 0 };
    acc[d].total += (s.cash || 0) + (s.card || 0);
    acc[d].cash += s.cash || 0;
    acc[d].card += s.card || 0;
    return acc;
  }, {});
  const dailyArr = Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date));

  // Expense breakdown by type
  const expByType = filteredExp.reduce((acc, e) => { acc[e.type] = (acc[e.type] || 0) + e.amount; return acc; }, {});

  // Top spending suppliers
  const supSpend = filteredInv.reduce((acc, i) => { acc[i.supplierName] = (acc[i.supplierName] || 0) + (i.total || 0); return acc; }, {});
  const topSuppliers = Object.entries(supSpend).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const barMax = Math.max(...dailyArr.map(d => d.total), 1);

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, color: C.text }}>Analytics & Reports</h1>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 24, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Input label="From" type="date" value={from} onChange={setFrom} />
        <Input label="To" type="date" value={to} onChange={setTo} />
        {venues.length > 0 && (
          <Select label="Venue" value={venueId} onChange={setVenueId}
            options={[{ value: "", label: "All Venues" }, ...venues.map(v => ({ value: v.id, label: v.name }))]} />
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
        <MetricCard label="Total Sales" value={fmtEur(totalSales)} color={C.green} icon="💰" />
        <MetricCard label="Total Expenses" value={fmtEur(totalExp + totalInv + dailyCosts)} color={C.red} icon="💸" />
        <MetricCard label="Net Profit" value={fmtEur(profit)} color={profit >= 0 ? C.green : C.red} icon="📈" />
        <MetricCard label="Profit Margin" value={totalSales ? `${((profit / totalSales) * 100).toFixed(1)}%` : "—"} color={C.accent} icon="%" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600, marginBottom: 14 }}>Daily Revenue</div>
          {dailyArr.length === 0
            ? <div style={{ color: C.textMuted, fontSize: 13 }}>No data in this range.</div>
            : (
              <div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 90 }}>
                  {dailyArr.map(d => (
                    <div key={d.date} title={`${d.date}: ${fmtEur(d.total)}`}
                      style={{ flex: 1, background: C.accent + "55", borderRadius: "3px 3px 0 0", height: `${(d.total / barMax) * 100}%`, minHeight: 3, cursor: "default" }}
                      onMouseEnter={e => e.currentTarget.style.background = C.accent + "99"}
                      onMouseLeave={e => e.currentTarget.style.background = C.accent + "55"} />
                  ))}
                </div>
                {dailyArr.length <= 14 && (
                  <div style={{ display: "flex", marginTop: 4 }}>
                    {dailyArr.map(d => <span key={d.date} style={{ flex: 1, fontSize: 9, color: C.textMuted, textAlign: "center" }}>{d.date.slice(5)}</span>)}
                  </div>
                )}
              </div>
            )}
        </Card>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600, marginBottom: 14 }}>Expenses by Type</div>
          {Object.entries(expByType).length === 0
            ? <div style={{ color: C.textMuted, fontSize: 13 }}>No fixed expenses.</div>
            : Object.entries(expByType).map(([type, amt]) => (
              <div key={type} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: C.textSub }}>{type}</span>
                  <span style={{ fontSize: 12, color: C.red }}>{fmtEur(amt)}</span>
                </div>
                <div style={{ height: 4, background: C.border, borderRadius: 2 }}>
                  <div style={{ height: "100%", background: C.red, borderRadius: 2, width: `${(amt / totalExp) * 100}%` }} />
                </div>
              </div>
            ))}
        </Card>
      </div>

      {topSuppliers.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: C.textSub, fontWeight: 600, marginBottom: 14 }}>Top Supplier Spend</div>
          {topSuppliers.map(([name, amt], i) => (
            <div key={name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: C.textMuted, width: 16 }}>{i + 1}</div>
              <div style={{ flex: 1, fontSize: 13, color: C.text }}>{name}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.amber }}>{fmtEur(amt)}</div>
              <div style={{ width: 120, height: 4, background: C.border, borderRadius: 2 }}>
                <div style={{ height: "100%", background: C.amber, borderRadius: 2, width: `${(amt / topSuppliers[0][1]) * 100}%` }} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ─── SETTINGS PAGE ───────────────────────────────────────────────────────────
function SettingsPage({ venues, setVenues, user, setUser }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Bar/Restaurant", address: "", phone: "" });

  const save = () => {
    setVenues(prev => [...prev, { id: uid(), ...form, createdAt: Date.now() }]);
    setShowAdd(false);
    setForm({ name: "", type: "Bar/Restaurant", address: "", phone: "" });
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 700 }}>
      <h1 style={{ margin: "0 0 28px", fontSize: 22, color: C.text }}>Settings</h1>

      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>Account</h2>
        <Card>
          <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <div style={{ width: 48, height: 48, background: C.accentDim, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>👤</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: C.textSub }}>{user?.email}</div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, color: C.text, margin: 0, fontWeight: 600 }}>My Venues</h2>
          <Btn onClick={() => setShowAdd(true)} size="sm">+ Add Venue</Btn>
        </div>
        {venues.length === 0
          ? <EmptyState icon="🏢" title="No venues yet" sub="Add your restaurant, bar or café to organize your data by location." action={<Btn onClick={() => setShowAdd(true)}>+ Add First Venue</Btn>} />
          : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {venues.map(v => (
                <Card key={v.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{v.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{v.type} {v.address ? `· ${v.address}` : ""}</div>
                    </div>
                    <button onClick={() => setVenues(prev => prev.filter(x => x.id !== v.id))} style={{ background: "none", border: "none", color: C.textMuted, cursor: "pointer", fontSize: 16 }}>🗑</button>
                  </div>
                </Card>
              ))}
            </div>
          )}
      </div>

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
          <Btn onClick={save}>Add Venue</Btn>
        </div>
      </Modal>

      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 15, color: C.text, margin: "0 0 14px", fontWeight: 600 }}>About</h2>
        <Card>
          <div style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>
            <strong style={{ color: C.text }}>ApexManager</strong> — Restaurant intelligence platform<br />
            AI-powered invoice scanning · Daily sales tracking · Cost analytics<br />
            <span style={{ color: C.textMuted, fontSize: 12 }}>Data stored locally in your browser. Export your ingredients CSV to use in food cost sheets.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => LS.get("apex_current_user", null));
  const [page, setPage] = useState("dashboard");
  const [venues, setVenues] = useStore("apex_venues", []);
  const [venueId, setVenueId] = useState("");
  const [sales, setSales] = useStore("apex_sales", []);
  const [expenses, setExpenses] = useStore("apex_expenses", []);
  const [invoices, setInvoices] = useStore("apex_invoices", []);
  const [suppliers, setSuppliers] = useStore("apex_suppliers", []);
  const [ingredients, setIngredients] = useStore("apex_ingredients", []);

  const venue = venues.find(v => v.id === venueId) || null;

  const handleLogin = (u) => {
    LS.set("apex_current_user", u);
    setUser(u);
  };

  const handleLogout = () => {
    LS.set("apex_current_user", null);
    setUser(null);
  };

  const handleVenueChange = (id) => setVenueId(id);

  if (!user) return <AuthScreen onLogin={handleLogin} />;

  const pageProps = { venues, sales, expenses, invoices, suppliers, ingredients, venue };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: C.bg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: C.text }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.5); }
        select option { background: ${C.surface}; }
      `}</style>

      <Sidebar page={page} setPage={setPage} venue={venue} venues={venues} onVenueChange={handleVenueChange} user={user} onLogout={handleLogout} />

      <main style={{ flex: 1, overflowY: "auto", minHeight: "100vh" }}>
        {page === "dashboard" && <DashboardPage {...pageProps} />}
        {page === "sales" && <SalesPage sales={sales} setSales={setSales} venues={venues} venue={venue} />}
        {page === "invoices" && <InvoicesPage invoices={invoices} setInvoices={setInvoices} suppliers={suppliers} setSuppliers={setSuppliers} setIngredients={setIngredients} venue={venue} />}
        {page === "expenses" && <ExpensesPage expenses={expenses} setExpenses={setExpenses} venue={venue} />}
        {page === "suppliers" && <SuppliersPage suppliers={suppliers} setSuppliers={setSuppliers} invoices={invoices} />}
        {page === "ingredients" && <IngredientsPage ingredients={ingredients} setIngredients={setIngredients} />}
        {page === "analytics" && <AnalyticsPage sales={sales} expenses={expenses} invoices={invoices} venues={venues} />}
        {page === "settings" && <SettingsPage venues={venues} setVenues={setVenues} user={user} setUser={setUser} />}
      </main>
    </div>
  );
}
