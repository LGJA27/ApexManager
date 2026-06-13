// IMAGES NEEDED — replace each <ImagePlaceholder imageId="X" /> with <img src="/images/X.png" alt="..." />
// hero-dashboard         — Full dashboard screenshot with real data, displayed in browser frame
// feature-invoice-scan   — Phone camera pointed at a paper invoice (portrait)
// feature-dashboard      — Dashboard analytics view with charts and real data
// feature-ingredients    — Ingredients table with prices and supplier data
// feature-sales          — Mobile daily sales form with numbers filled in
// feature-multivenue     — Venue switcher dropdown showing 3 venues
// testimonial-avatar-1   — Miguel Santos portrait photo
// testimonial-avatar-2   — Ana Rodrigues portrait photo
// testimonial-avatar-3   — Carlos Ferreira portrait photo
// before-chaos           — Scattered paper invoices / messy Excel screenshot
// after-dashboard        — Clean dashboard screenshot with organised data

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PLANS } from '../config/plans.js';
import Logo from '../components/Logo.jsx';

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useWindowWidth() {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return w;
}

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setRevealed(true); io.disconnect(); } },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, revealed];
}

function useCounter(end, duration = 1500, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active || end === 0) return;
    let t0 = null;
    const tick = (ts) => {
      if (!t0) t0 = ts;
      const p = Math.min((ts - t0) / duration, 1);
      setVal(Math.round(end * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
      else setVal(end);
    };
    requestAnimationFrame(tick);
  }, [active, end, duration]);
  return val;
}

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:        '#0D0D12',
  surface:   '#16161E',
  surfaceL:  '#1E1E28',
  border:    '#2A2A36',
  accent:    '#7C5CFC',
  accentDim: '#7C5CFC22',
  green:     '#22C97A',
  greenDim:  '#22C97A22',
  amber:     '#F5A623',
  red:       '#F04060',
  text:      '#F0F0F8',
  textSub:   '#8A8A9A',
  textMuted: '#55556A',
};

// ─── Framer-motion variants ───────────────────────────────────────────────────
const heroContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.13, delayChildren: 0.1 } },
};
const fadeUp   = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };
const fadeIn   = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } } };
const scaleFade = { hidden: { opacity: 0, scale: 0.95 }, show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: 'easeOut' } } };

// ─── ImagePlaceholder ─────────────────────────────────────────────────────────
function ImagePlaceholder({ imageId, aspectRatio = '16/9', label }) {
  return (
    <div
      data-image-id={imageId}
      style={{
        aspectRatio,
        background: C.surface,
        border: '2px dashed #2A2A36',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        color: '#3A3A48',
        fontSize: 13,
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 22, opacity: 0.5 }}>🖼</div>
      <div>[{imageId}]</div>
      {label && <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'center', maxWidth: 200 }}>{label}</div>}
    </div>
  );
}

// ─── Browser frame chrome ─────────────────────────────────────────────────────
function BrowserFrame({ imageId, label, children, overlay }) {
  return (
    <div style={{
      borderRadius: 12, overflow: 'hidden',
      border: `1px solid ${C.border}`,
      boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px #2A2A36',
      background: C.surfaceL,
      position: 'relative',
    }}>
      {/* Chrome bar */}
      <div style={{ background: C.surfaceL, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {['#FF5F57', '#FEBC2E', '#28C840'].map(col => (
            <div key={col} style={{ width: 10, height: 10, borderRadius: '50%', background: col }} />
          ))}
        </div>
        <div style={{ flex: 1, background: C.bg, borderRadius: 6, padding: '4px 12px', fontSize: 11, color: C.textMuted, fontFamily: 'monospace', border: `1px solid ${C.border}` }}>
          app.apexmanager.com/dashboard
        </div>
      </div>
      {/* Content */}
      {children || <ImagePlaceholder imageId={imageId} aspectRatio="16/9" label={label} />}
      {/* Overlay badge */}
      {overlay}
    </div>
  );
}

// ─── Phone mockup frame ───────────────────────────────────────────────────────
function PhoneMockup({ imageId, label, overlay }) {
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <div style={{
        width: 230, background: '#0A0A0F', borderRadius: 36,
        padding: '14px 8px', border: '7px solid #1A1A24',
        boxShadow: '0 24px 60px rgba(0,0,0,0.55), inset 0 0 0 1px #2A2A36',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 56, height: 5, background: '#1E1E28', borderRadius: 3 }} />
        </div>
        <div style={{ borderRadius: 22, overflow: 'hidden' }}>
          <ImagePlaceholder imageId={imageId} aspectRatio="9/16" label={label} />
        </div>
        <div style={{ height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8 }}>
          <div style={{ width: 36, height: 4, background: '#1E1E28', borderRadius: 2 }} />
        </div>
      </div>
      {overlay && (
        <div style={{
          position: 'absolute', bottom: 16, right: -24,
          background: C.surface, border: `1px solid ${C.border}`,
          borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: 190, maxWidth: 220,
        }}>
          {overlay}
        </div>
      )}
    </div>
  );
}

// ─── Scroll-reveal wrapper ────────────────────────────────────────────────────
function RevealItem({ children, delay = 0, y = 36, x = 0, scale = 1, duration = 0.6 }) {
  const [ref, ok] = useScrollReveal();
  const hidden = [`translateY(${y}px)`];
  if (x !== 0) hidden.push(`translateX(${x}px)`);
  if (scale !== 1) hidden.push(`scale(${scale})`);
  return (
    <div ref={ref} style={{
      opacity: ok ? 1 : 0,
      transform: ok ? 'none' : hidden.join(' '),
      transition: `opacity ${duration}s ease ${delay}s, transform ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
    }}>
      {children}
    </div>
  );
}

// ─── Stat pill with counting animation ───────────────────────────────────────
function StatPill({ target, format, label, active }) {
  const count = useCounter(target, 1500, active);
  return (
    <div style={{ background: C.surfaceL, border: `1px solid ${C.border}`, borderRadius: 99, padding: '12px 28px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontSize: 20, fontWeight: 800, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{format(count)}</span>
      <span style={{ fontSize: 13, color: C.textSub }}>{label}</span>
    </div>
  );
}

// ─── Feature badge ─────────────────────────────────────────────────────────────
function FeatureBadge({ label }) {
  return (
    <span style={{ display: 'inline-block', background: C.accentDim, color: C.accent, fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 99, border: `1px solid ${C.accent}44`, letterSpacing: '.8px', textTransform: 'uppercase', marginBottom: 20 }}>
      {label}
    </span>
  );
}

// ─── Alternating feature row ──────────────────────────────────────────────────
function FeatureRow({ badge, headline, description, bullets, imageContent, imageLeft = false, delay = 0 }) {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isDesktop = w >= 1024;

  const textCol = (
    <div style={{ flex: isDesktop ? '0 0 38%' : '1' }}>
      <FeatureBadge label={badge} />
      <h2 style={{ fontSize: isDesktop ? 36 : 26, fontWeight: 800, color: C.text, margin: '0 0 16px', lineHeight: 1.15 }}>{headline}</h2>
      <p style={{ fontSize: isDesktop ? 17 : isMobile ? 15 : 16, color: C.textSub, lineHeight: 1.75, margin: '0 0 24px' }}>{description}</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {bullets.map(b => (
          <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: isDesktop ? 15 : 14, color: C.textSub }}>
            <span style={{ color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{b}
          </li>
        ))}
      </ul>
    </div>
  );

  const imgCol = (
    <div style={{ flex: isDesktop ? '0 0 57%' : '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {imageContent}
    </div>
  );

  return (
    <RevealItem y={40} delay={delay}>
      <div style={{
        display: 'flex',
        flexDirection: isDesktop ? 'row' : 'column',
        gap: isDesktop ? 80 : 36,
        alignItems: 'center',
        padding: isDesktop ? '80px 0' : '48px 0',
        borderBottom: `1px solid ${C.border}`,
      }}>
        {isDesktop
          ? (imageLeft ? <>{imgCol}{textCol}</> : <>{textCol}{imgCol}</>)
          : <>{textCol}{imgCol}</>
        }
      </div>
    </RevealItem>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
const FAQS = [
  { q: 'Do I need a credit card to start?', a: 'No. The 14-day free trial is completely free. A card is only needed when you choose to upgrade to a paid plan.' },
  { q: 'Is my data secure?', a: 'Yes. All data is encrypted at rest and in transit, stored on European servers. We are fully GDPR compliant and never sell your data.' },
  { q: 'Can I use it for multiple restaurants?', a: 'Yes. The Growth plan supports up to 3 venues and the Pro plan supports unlimited locations. Switch between them instantly from the sidebar.' },
  { q: 'What languages are supported?', a: 'Currently English and Portuguese. More languages are on the roadmap.' },
  { q: 'Can I cancel anytime?', a: 'Yes, cancel from your account settings at any time. No lock-in contracts, no cancellation fees. Your data is always yours to export.' },
];

function FaqItem({ q, a, index }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const isDesktop = useWindowWidth() >= 1024;
  return (
    <RevealItem delay={index * 0.07} x={-16} y={0} duration={0.45}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ borderBottom: `1px solid ${C.border}`, borderRadius: 8, padding: '0 12px', background: hovered ? C.surfaceL : 'transparent', transition: 'background .18s' }}
      >
        <button onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '18px 0', textAlign: 'left', WebkitTapHighlightColor: 'transparent' }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{q}</span>
          <span style={{ color: C.accent, fontSize: 20, fontWeight: 300, flexShrink: 0, marginLeft: 16, display: 'inline-block', transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
        </button>
        <div style={{ display: 'grid', gridTemplateRows: open ? '1fr' : '0fr', transition: 'grid-template-rows 0.3s cubic-bezier(0.4,0,0.2,1)', opacity: open ? 1 : 0 }}>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: isDesktop ? 15 : 14, color: C.textSub, lineHeight: 1.8, paddingBottom: 20 }}>{a}</div>
          </div>
        </div>
      </div>
    </RevealItem>
  );
}

// ─── Pricing cards ────────────────────────────────────────────────────────────
const PAID_PLANS = ['starter', 'growth', 'pro'];

function LandingPricingCards() {
  const [billing, setBilling] = useState('monthly');
  const [hovered, setHovered] = useState(null);
  const navigate = useNavigate();
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isDesktop = w >= 1024;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: isMobile ? 28 : 40 }}>
        {['monthly', 'annual'].map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: billing === b ? C.accent : C.surfaceL, color: billing === b ? '#fff' : C.textSub, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8 }}>
            {b === 'annual' ? 'Annual' : 'Monthly'}
            {b === 'annual' && billing === 'annual' && <span style={{ background: C.greenDim, color: C.green, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>Save 2 months</span>}
          </button>
        ))}
        {billing === 'monthly' && <span style={{ fontSize: 12, color: C.green, fontWeight: 600, alignSelf: 'center' }}>↑ Save 2 months with Annual</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? 'repeat(3, 1fr)' : '1fr', gap: 16, alignItems: 'start' }}>
        {(isMobile ? PAID_PLANS.slice().reverse() : PAID_PLANS).map((key, i) => {
          const plan = PLANS[key];
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const perMo = billing === 'annual' ? Math.floor(plan.annualPrice / 12) : null;
          const isH = hovered === key;
          return (
            <RevealItem key={key} delay={i * 0.12} y={24} duration={0.55}>
              <div onMouseEnter={() => isDesktop && setHovered(key)} onMouseLeave={() => isDesktop && setHovered(null)}
                className={plan.popular ? 'pricing-popular' : ''}
                style={{ background: C.surface, border: `1px solid ${plan.popular ? C.accent : isH ? `${C.accent}88` : C.border}`, borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', transform: isH ? 'scale(1.02)' : 'scale(1)', transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease', marginTop: plan.popular && isDesktop ? -8 : 0 }}
              >
                {plan.popular && <div style={{ background: C.accent, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '7px 0' }}>Most Popular</div>}
                <div style={{ padding: plan.popular ? '36px 24px 28px' : '28px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>{plan.name}</div>
                  <div style={{ marginBottom: 24 }}>
                    {billing === 'annual' ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 38, fontWeight: 800, color: C.text }}>€{perMo}</span><span style={{ fontSize: 14, color: C.textSub }}>/mo</span></div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>€{price} billed annually</div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 38, fontWeight: 800, color: C.text }}>€{price}</span><span style={{ fontSize: 14, color: C.textSub }}>/mo</span></div>
                    )}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: isDesktop ? 15 : 13, color: C.textSub }}>
                        <span style={{ color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: plan.popular ? C.accent : C.accentDim, color: plan.popular ? '#fff' : C.accent, transition: 'all .18s', transform: isH ? 'scale(1.03)' : 'scale(1)' }}>
                    Start free trial
                  </button>
                </div>
              </div>
            </RevealItem>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: C.textMuted }}>14-day free trial on all plans · Cancel anytime · Prices in EUR</p>
    </div>
  );
}

// ─── Testimonials data ────────────────────────────────────────────────────────
const TESTIMONIALS = [
  {
    quote: 'Finally I know my actual food cost without spending hours in Excel. The invoice scanning alone is worth every cent.',
    name: 'Miguel Santos', role: 'Head Chef', restaurant: 'Tasca do Mercado, Lisboa',
  },
  {
    quote: 'I manage 3 restaurants and this is the first tool that actually makes multi-venue management feel simple.',
    name: 'Ana Rodrigues', role: 'Owner', restaurant: 'Grupo Taberna, Porto',
  },
  {
    quote: 'Scanning invoices with my phone and having everything organised automatically changed how I run my kitchen.',
    name: 'Carlos Ferreira', role: 'Owner', restaurant: 'O Petisco, Faro',
  },
];

// ─── Radial glow ─────────────────────────────────────────────────────────────
function RadialGlow({ size = 700 }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: size, height: size * 0.7, background: `radial-gradient(ellipse at center, ${C.accent}14 0%, transparent 65%)`, pointerEvents: 'none', zIndex: 0 }} />
  );
}

// ─── Section header helper ─────────────────────────────────────────────────────
function SectionHeader({ title, sub }) {
  const isDesktop = useWindowWidth() >= 1024;
  return (
    <RevealItem y={28}>
      <div style={{ textAlign: 'center', marginBottom: 56 }}>
        <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 800, margin: '0 0 14px', color: C.text, lineHeight: 1.2 }}>{title}</h2>
        {sub && <p style={{ fontSize: isDesktop ? 17 : 16, color: C.textSub, margin: 0 }}>{sub}</p>}
      </div>
    </RevealItem>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const w = useWindowWidth();
  const isMobile = w < 768;
  const isTablet = w >= 768;
  const isDesktop = w >= 1024;

  const [scrolled, setScrolled] = useState(false);

  const statsRef = useRef(null);
  const [statsActive, setStatsActive] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setStatsActive(true); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  const hp = isDesktop ? '40px' : isMobile ? '20px' : '32px';
  const inner = (maxW = 1100) => ({ maxWidth: maxW, margin: '0 auto', padding: `0 ${hp}` });
  const vPad = isMobile ? '64px 0' : '88px 0';

  // ── Invoice scan mockup ──────────────────────────────────────────────────────
  const invoiceScanMockup = (
    <PhoneMockup
      imageId="feature-invoice-scan"
      label="Camera viewfinder pointed at paper invoice"
      overlay={
        <>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.green, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.6px' }}>✓ Extracted successfully</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6, fontWeight: 600 }}>Fornecedor XYZ Lda.</div>
          {[['Bacalhau da Noruega', '€12.40'], ['Batata Doce 5kg', '€8.50'], ['Azeite Extra Virgem', '€18.90']].map(([name, price]) => (
            <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderTop: `1px solid ${C.border}`, fontSize: 11, color: C.textSub }}>
              <span>{name}</span>
              <span style={{ color: C.amber, fontWeight: 600 }}>{price}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, borderTop: `1px solid ${C.border}`, paddingTop: 7, fontWeight: 700, fontSize: 12, color: C.text }}>
            <span>Total</span><span>€63.50</span>
          </div>
        </>
      }
    />
  );

  // ── Dashboard feature mockup ─────────────────────────────────────────────────
  const dashboardMockup = (
    <BrowserFrame
      imageId="feature-dashboard"
      label="Dashboard with revenue chart, metric cards and cost breakdown"
      overlay={
        <div style={{ position: 'absolute', bottom: 16, right: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)', fontSize: 12 }}>
          <span style={{ color: C.green, fontWeight: 700, marginRight: 6 }}>↑ +12%</span>
          <span style={{ color: C.textSub }}>vs last month</span>
        </div>
      }
    />
  );

  // ── Ingredients CSS mockup ───────────────────────────────────────────────────
  const ingredientsMockup = (
    <div data-image-id="feature-ingredients" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1.5fr 1.2fr', padding: '10px 16px', background: C.surfaceL, borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {['Ingredient', 'Unit', 'Last Price', 'Supplier', 'Updated'].map(h => <div key={h}>{h}</div>)}
      </div>
      {[
        ['Bacalhau Seco', 'kg', '€12.40', 'Pesca Mar', 'Today', true],
        ['Batata Doce', '5 kg bag', '€8.50', 'Horta Verde', 'Today', true],
        ['Azeite Virgem', '5 L', '€18.90', 'Quinta Sol', '5d ago', false],
        ['Frango Inteiro', 'kg', '€3.20', 'Aves PT', 'Today', true],
        ['Arroz Carolino', '5 kg', '€6.80', 'Distribuidor', '1wk ago', false],
        ['Sal Marinho', 'kg', '€0.80', 'Salinas Sul', '2wk ago', false],
      ].map(([name, unit, price, supplier, updated, fresh], i) => (
        <div key={name} style={{ display: 'grid', gridTemplateColumns: '2fr 0.8fr 1fr 1.5fr 1.2fr', padding: '10px 16px', borderBottom: i < 5 ? `1px solid ${C.border}` : 'none', fontSize: 12, background: i % 2 !== 0 ? `${C.bg}55` : 'transparent' }}>
          <div style={{ color: C.text, fontWeight: 500 }}>{name}</div>
          <div style={{ color: C.textMuted }}>{unit}</div>
          <div style={{ color: fresh ? C.green : C.amber, fontWeight: 600 }}>{price}</div>
          <div style={{ color: C.textSub }}>{supplier}</div>
          <div style={{ color: C.textMuted, fontSize: 11 }}>{updated}</div>
        </div>
      ))}
    </div>
  );

  // ── Sales phone mockup ───────────────────────────────────────────────────────
  const salesMockup = (
    <PhoneMockup
      imageId="feature-sales"
      label="Daily sales form with cash/card fields filled in"
    />
  );

  // ── Multi-venue CSS mockup ───────────────────────────────────────────────────
  const multivenueMockup = (
    <div data-image-id="feature-multivenue" style={{ width: '100%', maxWidth: 380, position: 'relative' }}>
      {/* Simulated sidebar context */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Venue</div>
          {/* Dropdown trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: `${C.accent}18`, border: `1px solid ${C.accent}55`, borderRadius: 8, padding: '8px 12px', cursor: 'pointer' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>Tasca do Mercado</span>
            <span style={{ color: C.textMuted, marginLeft: 'auto', fontSize: 10 }}>▾</span>
          </div>
        </div>
        {/* Dropdown open */}
        <div style={{ background: C.surfaceL }}>
          {[
            { name: 'Tasca do Mercado', loc: 'Lisboa', active: true },
            { name: 'O Petisco',         loc: 'Faro',   active: false },
            { name: 'Cantina Central',   loc: 'Porto',  active: false },
          ].map(({ name, loc, active }, i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: active ? C.accentDim : 'transparent', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none', cursor: 'pointer' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: active ? C.accent : C.textMuted, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: active ? C.accent : C.textSub, fontWeight: active ? 600 : 400 }}>{name}</div>
                <div style={{ fontSize: 10, color: C.textMuted }}>{loc}</div>
              </div>
              {active && <span style={{ fontSize: 10, background: C.accentDim, color: C.accent, padding: '2px 8px', borderRadius: 99, fontWeight: 700, letterSpacing: '.3px', border: `1px solid ${C.accent}44` }}>Active</span>}
            </div>
          ))}
        </div>
        <div style={{ padding: '12px 16px', fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: C.accent }}>+</span> Add venue
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow-x: hidden; overflow-y: auto; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        a { text-decoration: none; }
        button, a { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .lp-navlink { position: relative; }
        .lp-navlink::after { content: ''; position: absolute; bottom: -3px; left: 0; width: 0; height: 1.5px; background: ${C.accent}; transition: width 0.22s ease; border-radius: 1px; }
        .lp-navlink:hover::after { width: 100%; }
        .cta-btn { transition: transform 0.15s ease !important; }
        .cta-btn:hover { transform: scale(1.04); }
        @keyframes pricingPulse { 0%,100% { box-shadow: 0 0 0 1px ${C.accent}44, 0 8px 40px ${C.accent}22; } 50% { box-shadow: 0 0 0 1px ${C.accent}88, 0 8px 40px ${C.accent}44; } }
        .pricing-popular { animation: pricingPulse 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'sticky', top: 0, zIndex: 100, width: '100%', background: scrolled ? 'rgba(13,13,18,0.92)' : 'rgba(13,13,18,0.85)', backdropFilter: 'blur(12px)', borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent', transition: 'border-color 0.3s ease, background 0.3s ease', height: isMobile ? 54 : 64 }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px' : '0 40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/"><Logo size={isMobile ? 26 : 30} /></Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMobile && <button className="lp-navlink" onClick={() => scrollTo('pricing')} style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: isDesktop ? 15 : 13, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, cursor: 'pointer' }}>Pricing</button>}
            {!isMobile && <Link to="/signin" className="lp-navlink" style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: isDesktop ? 15 : 13, color: C.textSub, border: `1px solid ${C.border}` }}>Sign In</Link>}
            <Link to="/register" className="cta-btn" style={{ padding: '9px 22px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: C.accent, color: '#fff', display: 'inline-block' }}>Start Free Trial</Link>
          </div>
        </div>
      </motion.nav>

      {/* ── HERO ──────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: isMobile ? '56px 0 40px' : '100px 0 0' }}>
        <RadialGlow size={900} />
        {/* Centered text content */}
        <motion.div variants={heroContainer} initial="hidden" animate="show"
          style={{ ...inner(680), textAlign: 'center', position: 'relative', zIndex: 1 }}
        >
          <motion.div variants={fadeIn} style={{ marginBottom: 24 }}>
            <span style={{ display: 'inline-block', background: C.accentDim, color: C.accent, fontSize: 11, fontWeight: 700, padding: '5px 14px', borderRadius: 99, border: `1px solid ${C.accent}44`, letterSpacing: '.6px', textTransform: 'uppercase' }}>
              Now with AI invoice scanning
            </span>
          </motion.div>
          <motion.div variants={fadeUp}>
            <span style={{ display: 'block', fontSize: isMobile ? '36px' : isTablet ? '52px' : '68px', fontWeight: 900, lineHeight: 1.1, color: C.text }}>
              Run your restaurant.
            </span>
          </motion.div>
          <motion.div variants={fadeUp} style={{ marginBottom: isMobile ? 18 : 20 }}>
            <span style={{ display: 'block', fontSize: isMobile ? '36px' : isTablet ? '52px' : '68px', fontWeight: 900, lineHeight: 1.1, color: C.accent }}>
              Not your spreadsheets.
            </span>
          </motion.div>
          <motion.p variants={fadeIn} style={{ fontSize: isMobile ? 15 : 18, color: C.textSub, lineHeight: 1.75, margin: isMobile ? '0 0 28px' : '0 0 36px' }}>
            Scan supplier invoices with AI, track daily sales, control costs and understand your business — all in one place.
          </motion.p>
          <motion.div variants={scaleFade} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', marginBottom: 16 }}>
            <Link to="/register" className="cta-btn" style={{ display: 'inline-block', padding: isMobile ? '13px 24px' : '15px 36px', borderRadius: 12, fontWeight: 700, fontSize: isMobile ? 15 : 17, background: C.accent, color: '#fff', width: isMobile ? '100%' : undefined, textAlign: 'center' }}>
              Start free — no card needed
            </Link>
            <button onClick={() => scrollTo('features')} style={{ padding: isMobile ? '13px 24px' : '15px 36px', borderRadius: 12, fontWeight: 700, fontSize: isMobile ? 15 : 17, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, cursor: 'pointer', width: isMobile ? '100%' : undefined, transition: 'opacity .15s' }}>
              See how it works
            </button>
          </motion.div>
          <motion.div variants={fadeIn} style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
            14-day free trial · Cancel anytime · GDPR compliant · Made for European restaurants
          </motion.div>
        </motion.div>

        {/* Large browser frame hero mockup */}
        <div style={{ ...inner(1100), marginTop: isMobile ? 40 : 64, position: 'relative', zIndex: 1 }}>
          <div style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}>
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.35 }}
              style={{ transform: 'rotateX(4deg)', transformOrigin: 'top center' }}
            >
              <BrowserFrame imageId="hero-dashboard" label="Dashboard with sales data, revenue chart and cost breakdown" />
            </motion.div>
          </div>
          {/* Gradient fade at bottom to blend into next section */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: `linear-gradient(to bottom, transparent, ${C.bg})`, pointerEvents: 'none' }} />
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ──────────────────────────────────────────────────── */}
      <section style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, background: C.surface, padding: isMobile ? '28px 0' : '36px 0' }}>
        <div style={{ ...inner(1100) }}>
          <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 20, fontWeight: 500, letterSpacing: '.4px', textTransform: 'uppercase', textAlign: 'center' }}>
            Trusted by restaurant owners across Portugal
          </div>
          <div ref={statsRef} style={{ display: 'flex', justifyContent: isDesktop ? 'space-evenly' : 'center', gap: 16, flexWrap: 'wrap' }}>
            <RevealItem delay={0} y={20}><StatPill target={2300} format={v => `€${(v/1000).toFixed(1)}M`} label="invoices scanned" active={statsActive} /></RevealItem>
            <RevealItem delay={0.1} y={20}><StatPill target={4800} format={v => v.toLocaleString()} label="hours saved" active={statsActive} /></RevealItem>
            <RevealItem delay={0.2} y={20}><StatPill target={320} format={v => `${v}+`} label="venues managed" active={statsActive} /></RevealItem>
          </div>
        </div>
      </section>

      {/* ── PROBLEM SECTION ───────────────────────────────────────────────────── */}
      <section style={{ padding: vPad }}>
        <div style={{ ...inner(1100), textAlign: 'center' }}>
          <SectionHeader
            title={<>Paper invoices. WhatsApp photos. Excel sheets.<br /><span style={{ color: C.textSub, fontWeight: 500 }}>Sound familiar?</span></>}
          />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {[
              { icon: '💸', text: "You don't know your real food cost until month end" },
              { icon: '📦', text: 'Supplier invoices pile up and never get digitised' },
              { icon: '📉', text: 'You have no idea which days or dishes make the most money' },
            ].map(({ icon, text }, i) => (
              <RevealItem key={text} delay={i * 0.13} y={36}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 14, padding: '28px 24px', textAlign: 'left' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{text}</p>
                </div>
              </RevealItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ────────────────────────────────────────────────────── */}
      <section style={{ padding: vPad, background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title="Before ApexManager vs After" sub="From chaos to clarity. The transformation takes minutes." />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isDesktop ? 32 : 20 }}>
            {/* Before */}
            <RevealItem delay={0} y={32}>
              <div style={{ background: `${C.red}0A`, border: `1px solid ${C.red}25`, borderRadius: 16, overflow: 'hidden' }}>
                <ImagePlaceholder imageId="before-chaos" aspectRatio="4/3" label="Scattered paper invoices, messy Excel spreadsheet, WhatsApp messages about prices" />
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>😰</span>
                  <span style={{ fontSize: 14, color: `${C.red}CC`, fontWeight: 500 }}>Invoices in a drawer. Costs unknown. Stress high.</span>
                </div>
              </div>
            </RevealItem>
            {/* After */}
            <RevealItem delay={0.15} y={32}>
              <div style={{ background: `${C.green}0A`, border: `1px solid ${C.green}25`, borderRadius: 16, overflow: 'hidden' }}>
                <ImagePlaceholder imageId="after-dashboard" aspectRatio="4/3" label="Clean Apex Manager dashboard with organised invoices, charts and clear profit visibility" />
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontSize: 14, color: `${C.green}CC`, fontWeight: 500 }}>Everything organised. Costs tracked. Profit visible.</span>
                </div>
              </div>
            </RevealItem>
          </div>
        </div>
      </section>

      {/* ── ALTERNATING FEATURE ROWS ──────────────────────────────────────────── */}
      <section id="features" style={{ padding: `${isMobile ? 48 : 80}px 0 0` }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title={<>Everything you need.<br />Nothing you don't.</>} sub="Built for small restaurant operators — not enterprise software in disguise." />

          {/* ROW 1 — AI Invoice Scanning */}
          <FeatureRow
            badge="AI-POWERED"
            headline="Point. Shoot. Done."
            description="Photograph any supplier invoice. Our AI extracts every line item, unit price, tax rate, supplier NIF and IBAN in seconds. No typing required."
            bullets={['Works with handwritten invoices', 'Supports Portuguese and Spanish invoices', 'Auto-creates supplier profile', 'Updates ingredient costs automatically']}
            imageContent={invoiceScanMockup}
            imageLeft
            delay={0}
          />

          {/* ROW 2 — Dashboard & Analytics */}
          <FeatureRow
            badge="REAL-TIME"
            headline="Your restaurant's vital signs. At a glance."
            description="Revenue trends, cost breakdowns, profit margins and supplier spend — all updated the moment you log a sale or scan an invoice."
            bullets={['Daily, weekly, monthly and yearly views', 'Cash vs card split', 'Estimated profit margin', 'Compare venues side by side']}
            imageContent={dashboardMockup}
            imageLeft={false}
            delay={0.05}
          />

          {/* ROW 3 — Ingredient Cost Database */}
          <FeatureRow
            badge="COST CONTROL"
            headline="Know your food cost down to the gram."
            description="Every invoice scan automatically updates your ingredient price database. Export to your food cost sheets and technical recipe cards."
            bullets={['Price history tracked over time', 'Export to CSV for food cost sheets', 'Know instantly when a supplier raises prices', 'Compare costs across suppliers']}
            imageContent={ingredientsMockup}
            imageLeft
            delay={0.05}
          />

          {/* ROW 4 — Daily Sales Log */}
          <FeatureRow
            badge="DAILY TRACKING"
            headline="Log your day in 30 seconds."
            description="Cash sales, card sales, expenses, staff attendance. Log it manually or photograph your POS daily report and let AI fill it in for you."
            bullets={['Scan POS ticket with AI', 'Track staff attendance per day', 'Cash vs card breakdown', 'Instant profit visibility']}
            imageContent={salesMockup}
            imageLeft={false}
            delay={0.05}
          />

          {/* ROW 5 — Multi-venue */}
          <FeatureRow
            badge="MULTI-VENUE"
            headline="One account. All your locations."
            description="Switch between venues instantly. Data is always separated but your view is always unified. Perfect for restaurant groups and owners expanding."
            bullets={['Unlimited venues on Pro plan', 'Consolidated analytics across all venues', 'Per-venue staff and supplier management', 'Compare performance between locations']}
            imageContent={multivenueMockup}
            imageLeft
            delay={0.05}
          />
        </div>
      </section>

      {/* ── PRICING SECTION ───────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: vPad, background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1000) }}>
          <SectionHeader title="Simple pricing for real restaurants" sub="Start free. Upgrade when you're ready. No hidden fees." />
          <LandingPricingCards />
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────── */}
      <section style={{ padding: vPad, borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title="Loved by restaurant owners" sub="Join hundreds of operators across Portugal who use Apex Manager every day." />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <RevealItem key={i} delay={i * 0.12} y={28} scale={0.97}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Stars */}
                  <div style={{ color: C.amber, fontSize: 14, letterSpacing: 2, marginBottom: 16 }}>★★★★★</div>
                  {/* Quote */}
                  <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 20px', flex: 1 }}>"{t.quote}"</p>
                  {/* Attribution */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <ImagePlaceholder imageId={`testimonial-avatar-${i + 1}`} aspectRatio="1/1" label={`${t.name} photo`} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{t.role}, {t.restaurant}</div>
                    </div>
                  </div>
                </div>
              </RevealItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────────── */}
      <section style={{ padding: vPad, background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...inner(760) }}>
          <SectionHeader title="Frequently asked questions" />
          {FAQS.map((faq, i) => <FaqItem key={faq.q} {...faq} index={i} />)}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: isMobile ? '64px 0' : '110px 0', background: C.surface }}>
        <RadialGlow size={600} />
        <div style={{ ...inner(600), textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <RevealItem scale={0.97} y={20}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <Logo size={44} showText={false} />
            </div>
            <h2 style={{ fontSize: 'clamp(28px,3vw,42px)', fontWeight: 900, margin: '0 0 18px', color: C.text }}>
              Ready to take control of your costs?
            </h2>
            <p style={{ fontSize: 17, color: C.textSub, lineHeight: 1.7, margin: '0 0 36px' }}>
              Join hundreds of restaurant owners who stopped guessing and started knowing.
            </p>
            <Link to="/register" className="cta-btn" style={{ display: 'inline-block', padding: '15px 40px', borderRadius: 12, fontWeight: 700, fontSize: 17, background: C.accent, color: '#fff' }}>
              Start your free trial
            </Link>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 20 }}>
              No credit card required · 14-day free trial · Cancel anytime
            </div>
          </RevealItem>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bg, padding: isMobile ? '36px 20px 28px' : '52px 0 32px' }}>
        <div style={{ ...inner(1100) }}>
          {isDesktop ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginBottom: 36, alignItems: 'start' }}>
              <div>
                <div style={{ marginBottom: 14 }}><Logo size={26} /></div>
                <p style={{ fontSize: isDesktop ? 14 : 13, color: C.textMuted, margin: 0, lineHeight: 1.75, maxWidth: 220 }}>
                  Restaurant intelligence platform for small operators across Europe.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 48, justifyContent: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>Product</div>
                  {[{ label: 'Features', anchor: '#features' }, { label: 'Pricing', anchor: '#pricing' }].map(({ label, anchor }) => (
                    <div key={label} style={{ marginBottom: 9 }}><a href={anchor} className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>{label}</a></div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>Legal</div>
                  {[{ label: 'Privacy', to: '/privacy' }, { label: 'Terms', to: '/terms' }, { label: 'Cookies', to: '/cookies' }].map(({ label, to }) => (
                    <div key={label} style={{ marginBottom: 9 }}><Link to={to} className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>{label}</Link></div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>Company</div>
                <div style={{ marginBottom: 9 }}><a href="mailto:hello@apexmanager.app" className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>Contact</a></div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 24 }}>© 2026 ApexManager. All rights reserved.</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>[Your Company] · NIF: [NIF]</div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 14 }}><Logo size={24} /></div>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.65 }}>
                Restaurant intelligence platform for small operators across Europe.
              </p>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Product</div>
                  {[{ label: 'Features', anchor: '#features' }, { label: 'Pricing', anchor: '#pricing' }].map(({ label, anchor }) => (
                    <div key={label} style={{ marginBottom: 8 }}><a href={anchor} style={{ fontSize: 13, color: C.textSub }}>{label}</a></div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Legal</div>
                  {[{ label: 'Privacy Policy', to: '/privacy' }, { label: 'Terms', to: '/terms' }, { label: 'Cookies', to: '/cookies' }].map(({ label, to }) => (
                    <div key={label} style={{ marginBottom: 8 }}><Link to={to} style={{ fontSize: 13, color: C.textSub }}>{label}</Link></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>© 2026 ApexManager. All rights reserved.</span>
            <span style={{ fontSize: 12, color: C.textMuted }}>[Your Company Name] · NIF: [your NIF]</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
