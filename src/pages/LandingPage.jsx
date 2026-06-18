// IMAGES NEEDED — add paths to LANDING_IMAGES below as assets become available
// hero-dashboard         ✓ /images/hero-dashboard.png
// after-dashboard        ✓ /images/after-dashboard.png
// feature-invoice-scan   — Phone camera pointed at a paper invoice (portrait)
// feature-dashboard      — Dashboard analytics view with charts and real data
// feature-sales          — Mobile daily sales form with numbers filled in
// feature-multivenue     — Venue switcher dropdown showing 3 venues
// testimonial-avatar-1   — Miguel Santos portrait photo
// testimonial-avatar-2   — Ana Rodrigues portrait photo
// testimonial-avatar-3   — Carlos Ferreira portrait photo
// before-chaos           — Scattered paper invoices / messy Excel screenshot
// after-dashboard        ✓ /images/after-dashboard.png

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LandingLanguageToggle from '../components/LandingLanguageToggle.jsx';
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

const LANDING_IMAGES = {
  'hero-dashboard': '/images/hero-dashboard.png',
  'after-dashboard': '/images/after-dashboard.png',
};

// ─── ImagePlaceholder ─────────────────────────────────────────────────────────
function ImagePlaceholder({ imageId, aspectRatio = '16/9', label }) {
  const src = LANDING_IMAGES[imageId];
  if (src) {
    return (
      <div data-image-id={imageId} style={{ aspectRatio, overflow: 'hidden', background: C.bg }}>
        <img
          src={src}
          alt={label || imageId}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
        />
      </div>
    );
  }
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
  const { t } = useTranslation();
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
          {t('landing.browserUrl')}
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

// ─── i18n helpers ─────────────────────────────────────────────────────────────
const CONTACT_SUBJECTS = [
  { value: 'general', key: 'landing.contactSubjectGeneral' },
  { value: 'support', key: 'landing.contactSubjectSupport' },
  { value: 'billing', key: 'landing.contactSubjectBilling' },
  { value: 'partnership', key: 'landing.contactSubjectPartnership' },
];

function getFeatureCards(t) {
  return [
    { icon: '🧾', title: t('landing.feature1Title'), description: t('landing.feature1Desc') },
    { icon: '💳', title: t('landing.feature2Title'), description: t('landing.feature2Desc') },
    { icon: '📊', title: t('landing.feature3Title'), description: t('landing.feature3Desc') },
    { icon: '📋', title: t('landing.feature4Title'), description: t('landing.feature4Desc') },
    { icon: '🏢', title: t('landing.feature5Title'), description: t('landing.feature5Desc') },
  ];
}

function getFaqs(t) {
  return [
    { q: t('landing.faq1Q'), a: t('landing.faq1A') },
    { q: t('landing.faq2Q'), a: t('landing.faq2A') },
    { q: t('landing.faq3Q'), a: t('landing.faq3A') },
    { q: t('landing.faq4Q'), a: t('landing.faq4A') },
    { q: t('landing.faq5Q'), a: t('landing.faq5A') },
    { q: t('landing.faq6Q'), a: t('landing.faq6A') },
  ];
}

function getTestimonials(t) {
  return [
    { quote: t('landing.testimonial1Quote'), name: t('landing.testimonial1Name'), role: t('landing.testimonial1Role'), restaurant: t('landing.testimonial1Restaurant') },
    { quote: t('landing.testimonial2Quote'), name: t('landing.testimonial2Name'), role: t('landing.testimonial2Role'), restaurant: t('landing.testimonial2Restaurant') },
    { quote: t('landing.testimonial3Quote'), name: t('landing.testimonial3Name'), role: t('landing.testimonial3Role'), restaurant: t('landing.testimonial3Restaurant') },
  ];
}

const PLAN_FEATURE_KEYS = {
  '1 venue': 'landing.planFeat1Venue',
  'Up to 3 venues': 'landing.planFeat3Venues',
  'Unlimited venues': 'landing.planFeatUnlimitedVenues',
  'Unlimited AI invoice scans': 'landing.planFeatUnlimitedScans',
  'Full sales history': 'landing.planFeatFullHistory',
  'CSV export': 'landing.planFeatCsvExport',
  'Full analytics': 'landing.planFeatFullAnalytics',
  'PDF reports': 'landing.planFeatPdfReports',
  'Priority support': 'landing.planFeatPrioritySupport',
};

function translatePlanFeature(t, feature) {
  const key = PLAN_FEATURE_KEYS[feature];
  return key ? t(key) : feature;
}

const PLAN_NAME_KEYS = { starter: 'landing.planStarter', growth: 'landing.planGrowth', pro: 'landing.planPro' };

function translatePlanName(t, planKey) {
  return t(PLAN_NAME_KEYS[planKey] || planKey);
}

// ─── Feature cards ─────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, description, delay = 0 }) {
  const isDesktop = useWindowWidth() >= 1024;
  return (
    <RevealItem delay={delay} y={24}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: isDesktop ? '28px 26px' : '24px 20px', height: '100%' }}>
        <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: '0 0 12px', lineHeight: 1.3 }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.75, margin: 0 }}>{description}</p>
      </div>
    </RevealItem>
  );
}

// ─── Contact form ───────────────────────────────────────────────────────────────
function ContactSection({ isMobile, inner }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: 'general', message: '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const inputStyle = {
    width: '100%',
    background: C.surfaceL,
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 14,
    color: C.text,
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.email.trim() || !form.subject || !form.message.trim()) {
      setError(t('auth.fillFields'));
      return;
    }
    setSaving(true);
    const subjectLabel = t(CONTACT_SUBJECTS.find(s => s.value === form.subject)?.key || 'landing.contactSubjectGeneral');
    const body = `${t('landing.contactName')}: ${form.name}\n${t('landing.contactEmail')}: ${form.email}\n\n${form.message}`;
    window.location.href = `mailto:support@apexmanager.com?subject=${encodeURIComponent(subjectLabel)}&body=${encodeURIComponent(body)}`;
    setTimeout(() => {
      setSaving(false);
      setSuccess(true);
      setForm({ name: '', email: '', subject: 'general', message: '' });
    }, 500);
  };

  return (
    <section id="contact" style={{ padding: isMobile ? '64px 0' : '88px 0', background: C.surface }}>
      <div style={{ ...inner(600), textAlign: 'center' }}>
        <RevealItem y={24}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: '0 0 12px' }}>{t('landing.getInTouch')}</h2>
          <p style={{ fontSize: 16, color: C.textSub, margin: '0 0 32px', lineHeight: 1.6 }}>{t('landing.contactSub')}</p>
        </RevealItem>
        <RevealItem y={20} delay={0.08}>
          <form onSubmit={submit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{t('landing.contactName')} {t('landing.requiredField')}</label>
              <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder={t('landing.contactNamePlaceholder')} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{t('landing.contactEmail')} {t('landing.requiredField')}</label>
              <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder={t('landing.contactEmailPlaceholder')} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{t('landing.contactSubject')} {t('landing.requiredField')}</label>
              <select required value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {CONTACT_SUBJECTS.map(s => <option key={s.value} value={s.value}>{t(s.key)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: C.textSub, marginBottom: 6 }}>{t('landing.contactMessage')} {t('landing.requiredField')}</label>
              <textarea required value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder={t('landing.contactMessagePlaceholder')} rows={5} style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }} />
            </div>
            {error && <div style={{ fontSize: 13, color: C.red }}>{error}</div>}
            {success && <div style={{ fontSize: 14, color: C.green, fontWeight: 600 }}>{t('landing.messageSent')}</div>}
            <button type="submit" disabled={saving} style={{ width: '100%', padding: '14px 0', borderRadius: 10, border: 'none', cursor: saving ? 'wait' : 'pointer', fontWeight: 700, fontSize: 15, background: C.accent, color: '#fff', marginTop: 4, opacity: saving ? 0.7 : 1 }}>
              {saving ? t('common.loading') : t('landing.sendMessage')}
            </button>
          </form>
        </RevealItem>
      </div>
    </section>
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
  const { t } = useTranslation();
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
            {b === 'annual' ? t('landing.annual') : t('landing.monthly')}
            {b === 'annual' && billing === 'annual' && <span style={{ background: C.greenDim, color: C.green, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99 }}>{t('landing.save2months')}</span>}
          </button>
        ))}
        {billing === 'monthly' && <span style={{ fontSize: 12, color: C.green, fontWeight: 600, alignSelf: 'center' }}>↑ {t('landing.saveWithAnnual')}</span>}
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
                {plan.popular && <div style={{ background: C.accent, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '7px 0' }}>{t('landing.mostPopular')}</div>}
                <div style={{ padding: plan.popular ? '36px 24px 28px' : '28px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>{translatePlanName(t, key)}</div>
                  <div style={{ marginBottom: 24 }}>
                    {billing === 'annual' ? (
                      <>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 38, fontWeight: 800, color: C.text }}>€{perMo}</span><span style={{ fontSize: 14, color: C.textSub }}>{t('landing.pricingPerMo')}</span></div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{t('landing.pricingBilledAnnually', { price })}</div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}><span style={{ fontSize: 38, fontWeight: 800, color: C.text }}>€{price}</span><span style={{ fontSize: 14, color: C.textSub }}>{t('landing.pricingPerMo')}</span></div>
                    )}
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: isDesktop ? 15 : 13, color: C.textSub }}>
                        <span style={{ color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>{translatePlanFeature(t, f)}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: plan.popular ? C.accent : C.accentDim, color: plan.popular ? '#fff' : C.accent, transition: 'all .18s', transform: isH ? 'scale(1.03)' : 'scale(1)' }}>
                    {t('landing.startTrial')}
                  </button>
                </div>
              </div>
            </RevealItem>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: C.textMuted }}>{t('landing.trustLine')}</p>
    </div>
  );
}

// ─── Testimonials data ────────────────────────────────────────────────────────

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
  const { t } = useTranslation();
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
  const featureCards = getFeatureCards(t);
  const faqs = getFaqs(t);
  const testimonials = getTestimonials(t);
  const problemCards = [
    { icon: '💸', titleKey: 'landing.problem1Title', subKey: 'landing.problem1Sub' },
    { icon: '📦', titleKey: 'landing.problem2Title', subKey: 'landing.problem2Sub' },
    { icon: '📉', titleKey: 'landing.problem3Title', subKey: 'landing.problem3Sub' },
  ];

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
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 12px' : '0 40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <Link to="/" style={{ flexShrink: 0 }}><Logo size={isMobile ? 28 : 30} showText={!isMobile} /></Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 8, flexShrink: 0 }}>
            {!isMobile && (
              <>
                <button className="lp-navlink" onClick={() => scrollTo('pricing')} style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: isDesktop ? 15 : 13, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, cursor: 'pointer' }}>{t('landing.pricing')}</button>
                <LandingLanguageToggle />
                <Link to="/signin" className="lp-navlink" style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: isDesktop ? 15 : 13, color: C.textSub, border: `1px solid ${C.border}` }}>{t('landing.signIn')}</Link>
                <button className="lp-navlink" onClick={() => scrollTo('contact')} style={{ padding: '9px 18px', borderRadius: 10, fontWeight: 700, fontSize: isDesktop ? 15 : 13, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, cursor: 'pointer' }}>{t('landing.contact')}</button>
              </>
            )}
            {isMobile && (
              <>
                <LandingLanguageToggle compact />
                <Link to="/signin" className="lp-navlink" style={{ padding: '8px 12px', borderRadius: 10, fontWeight: 600, fontSize: 13, color: C.textSub, border: `1px solid ${C.border}`, flexShrink: 0, whiteSpace: 'nowrap' }}>{t('landing.signIn')}</Link>
              </>
            )}
            <Link to="/register" className="cta-btn" style={{ padding: isMobile ? '8px 14px' : '9px 22px', borderRadius: 10, fontWeight: 700, fontSize: isMobile ? 12 : 13, background: C.accent, color: '#fff', display: 'inline-block', flexShrink: 0, whiteSpace: 'nowrap' }}>{t('landing.startTrial')}</Link>
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
              {t('landing.nowWithAI')}
            </span>
          </motion.div>
          <motion.div variants={fadeUp}>
            <span style={{ display: 'block', fontSize: isMobile ? '36px' : isTablet ? '52px' : '68px', fontWeight: 900, lineHeight: 1.1, color: C.text }}>
              {t('landing.hero1')}
            </span>
          </motion.div>
          <motion.div variants={fadeUp} style={{ marginBottom: isMobile ? 18 : 20 }}>
            <span style={{ display: 'block', fontSize: isMobile ? '36px' : isTablet ? '52px' : '68px', fontWeight: 900, lineHeight: 1.1, color: C.accent }}>
              {t('landing.hero2')}
            </span>
          </motion.div>
          <motion.p variants={fadeIn} style={{ fontSize: isMobile ? 15 : 18, color: C.textSub, lineHeight: 1.75, margin: isMobile ? '0 0 28px' : '0 0 36px' }}>
            {t('landing.heroSub')}
          </motion.p>
          <motion.div variants={scaleFade} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', marginBottom: 16 }}>
            <Link to="/register" className="cta-btn" style={{ display: 'inline-block', padding: isMobile ? '13px 24px' : '15px 36px', borderRadius: 12, fontWeight: 700, fontSize: isMobile ? 15 : 17, background: C.accent, color: '#fff', width: isMobile ? '100%' : undefined, textAlign: 'center' }}>
              {t('landing.startFree')}
            </Link>
            <button onClick={() => scrollTo('features')} style={{ padding: isMobile ? '13px 24px' : '15px 36px', borderRadius: 12, fontWeight: 700, fontSize: isMobile ? 15 : 17, background: 'transparent', color: C.textSub, border: `1px solid ${C.border}`, cursor: 'pointer', width: isMobile ? '100%' : undefined, transition: 'opacity .15s' }}>
              {t('landing.seeHow')}
            </button>
          </motion.div>
          <motion.div variants={fadeIn} style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.8 }}>
            {t('landing.trustLine')}
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
              <BrowserFrame imageId="hero-dashboard" label={t('landing.heroDashboardLabel')} />
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
            {t('landing.trustedBy')}
          </div>
          <div ref={statsRef} style={{ display: 'flex', justifyContent: isDesktop ? 'space-evenly' : 'center', gap: 16, flexWrap: 'wrap' }}>
            <RevealItem delay={0} y={20}><StatPill target={2300} format={v => `€${(v/1000).toFixed(1)}M`} label={t('landing.trustedStat1')} active={statsActive} /></RevealItem>
            <RevealItem delay={0.1} y={20}><StatPill target={4800} format={v => v.toLocaleString()} label={t('landing.trustedStat2')} active={statsActive} /></RevealItem>
            <RevealItem delay={0.2} y={20}><StatPill target={320} format={v => `${v}+`} label={t('landing.trustedStat3')} active={statsActive} /></RevealItem>
          </div>
        </div>
      </section>

      {/* ── PROBLEM SECTION ───────────────────────────────────────────────────── */}
      <section style={{ padding: vPad }}>
        <div style={{ ...inner(1100), textAlign: 'center' }}>
          <SectionHeader title={t('landing.problemTitle')} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 16 }}>
            {problemCards.map(({ icon, titleKey, subKey }, i) => (
              <RevealItem key={titleKey} delay={i * 0.13} y={36}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 14, padding: '28px 24px', textAlign: 'left' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{icon}</div>
                  <p style={{ fontSize: 15, color: C.text, lineHeight: 1.5, margin: '0 0 8px', fontWeight: 600 }}>{t(titleKey)}</p>
                  <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, margin: 0 }}>{t(subKey)}</p>
                </div>
              </RevealItem>
            ))}
          </div>
        </div>
      </section>

      {/* ── BEFORE / AFTER ────────────────────────────────────────────────────── */}
      <section style={{ padding: vPad, background: C.surface, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title={t('landing.beforeAfterTitle')} sub={t('landing.beforeAfterSub')} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isDesktop ? 32 : 20 }}>
            {/* Before */}
            <RevealItem delay={0} y={32}>
              <div style={{ background: `${C.red}0A`, border: `1px solid ${C.red}25`, borderRadius: 16, overflow: 'hidden' }}>
                <ImagePlaceholder imageId="before-chaos" aspectRatio="4/3" label={t('landing.beforeImageLabel')} />
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>😰</span>
                  <span style={{ fontSize: 14, color: `${C.red}CC`, fontWeight: 500 }}>{t('landing.beforeLabel')}</span>
                </div>
              </div>
            </RevealItem>
            {/* After */}
            <RevealItem delay={0.15} y={32}>
              <div style={{ background: `${C.green}0A`, border: `1px solid ${C.green}25`, borderRadius: 16, overflow: 'hidden' }}>
                <ImagePlaceholder imageId="after-dashboard" aspectRatio="4/3" label={t('landing.afterImageLabel')} />
                <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 16 }}>✨</span>
                  <span style={{ fontSize: 14, color: `${C.green}CC`, fontWeight: 500 }}>{t('landing.afterLabel')}</span>
                </div>
              </div>
            </RevealItem>
          </div>
        </div>
      </section>

      {/* ── FEATURE CARDS ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: vPad }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title={t('landing.featuresTitle')} sub={t('landing.featuresSub')} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: 16 }}>
            {featureCards.map((card, i) => (
              <FeatureCard key={card.title} {...card} delay={i * 0.08} />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ───────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: vPad, background: C.surface, borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1000) }}>
          <SectionHeader title={t('landing.pricingTitle')} sub={t('landing.pricingSub')} />
          <LandingPricingCards />
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────────── */}
      <section style={{ padding: vPad, borderTop: `1px solid ${C.border}` }}>
        <div style={{ ...inner(1100) }}>
          <SectionHeader title={t('landing.testimonialTitle')} sub={t('landing.testimonialSub')} />
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 20 }}>
            {testimonials.map((item, i) => (
              <RevealItem key={i} delay={i * 0.12} y={28} scale={0.97}>
                <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                  {/* Stars */}
                  <div style={{ color: C.amber, fontSize: 14, letterSpacing: 2, marginBottom: 16 }}>★★★★★</div>
                  {/* Quote */}
                  <p style={{ fontSize: 15, color: C.text, lineHeight: 1.75, fontStyle: 'italic', margin: '0 0 20px', flex: 1 }}>&ldquo;{item.quote}&rdquo;</p>
                  {/* Attribution */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                      <ImagePlaceholder imageId={`testimonial-avatar-${i + 1}`} aspectRatio="1/1" label={t('landing.testimonialPhotoLabel', { name: item.name })} />
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{item.name}</div>
                      <div style={{ fontSize: 12, color: C.textSub }}>{item.role}, {item.restaurant}</div>
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
          <SectionHeader title={t('landing.faqTitle')} />
          {faqs.map((faq, i) => <FaqItem key={faq.q} {...faq} index={i} />)}
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
              {t('landing.ctaTitle')}
            </h2>
            <p style={{ fontSize: 17, color: C.textSub, lineHeight: 1.7, margin: '0 0 36px' }}>
              {t('landing.ctaSub')}
            </p>
            <Link to="/register" className="cta-btn" style={{ display: 'inline-block', padding: '15px 40px', borderRadius: 12, fontWeight: 700, fontSize: 17, background: C.accent, color: '#fff' }}>
              {t('landing.ctaButton')}
            </Link>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 20 }}>
              {t('landing.trustLine')}
            </div>
          </RevealItem>
        </div>
      </section>

      {/* ── CONTACT ───────────────────────────────────────────────────────────── */}
      <ContactSection isMobile={isMobile} inner={inner} />

      {/* ── FOOTER ────────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bg, padding: isMobile ? '36px 20px 28px' : '52px 0 32px' }}>
        <div style={{ ...inner(1100) }}>
          {isDesktop ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 40, marginBottom: 36, alignItems: 'start' }}>
              <div>
                <div style={{ marginBottom: 14 }}><Logo size={26} /></div>
                <p style={{ fontSize: isDesktop ? 14 : 13, color: C.textMuted, margin: 0, lineHeight: 1.75, maxWidth: 220 }}>
                  {t('landing.footerTagline')}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 48, justifyContent: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>{t('landing.footerProduct')}</div>
                  {[{ label: t('landing.features'), anchor: '#features' }, { label: t('landing.pricing'), anchor: '#pricing' }, { label: t('landing.contact'), anchor: '#contact' }].map(({ label, anchor }) => (
                    <div key={label} style={{ marginBottom: 9 }}><a href={anchor} className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>{label}</a></div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>{t('landing.footerLegal')}</div>
                  {[{ label: t('landing.footerPrivacy'), to: '/privacy' }, { label: t('landing.footerTerms'), to: '/terms' }, { label: t('landing.footerCookies'), to: '/cookies' }].map(({ label, to }) => (
                    <div key={to} style={{ marginBottom: 9 }}><Link to={to} className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>{label}</Link></div>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 14 }}>{t('landing.footerCompany')}</div>
                <div style={{ marginBottom: 9 }}><a href="#contact" className="lp-navlink" style={{ fontSize: isDesktop ? 14 : 13, color: C.textSub }}>{t('landing.contact')}</a></div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 24 }}>{t('landing.footerCopyright')}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{t('landing.footerCompanyLine')}</div>
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 24 }}>
              <div style={{ marginBottom: 14 }}><Logo size={24} /></div>
              <p style={{ fontSize: 13, color: C.textMuted, margin: '0 0 20px', lineHeight: 1.65 }}>
                {t('landing.footerTagline')}
              </p>
              <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>{t('landing.footerProduct')}</div>
                  {[{ label: t('landing.features'), anchor: '#features' }, { label: t('landing.pricing'), anchor: '#pricing' }, { label: t('landing.contact'), anchor: '#contact' }].map(({ label, anchor }) => (
                    <div key={label} style={{ marginBottom: 8 }}><a href={anchor} style={{ fontSize: 13, color: C.textSub }}>{label}</a></div>
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>{t('landing.footerLegal')}</div>
                  {[{ label: t('landing.footerPrivacyPolicy'), to: '/privacy' }, { label: t('landing.footerTerms'), to: '/terms' }, { label: t('landing.footerCookies'), to: '/cookies' }].map(({ label, to }) => (
                    <div key={to} style={{ marginBottom: 8 }}><Link to={to} style={{ fontSize: 13, color: C.textSub }}>{label}</Link></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <span style={{ fontSize: 12, color: C.textMuted }}>{t('landing.footerCopyright')}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <LandingLanguageToggle />
              <span style={{ fontSize: 12, color: C.textMuted }}>{t('landing.footerCompanyLine')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
