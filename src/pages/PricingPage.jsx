import { useState } from 'react';
import { PLANS } from '../config/plans.js';

// ─── Design tokens (matches App.jsx) ─────────────────────────────────────────
const C = {
  bg:        '#0D0D12',
  surface:   '#16161E',
  surfaceL:  '#1E1E28',
  border:    '#2A2A36',
  accent:    '#7C5CFC',
  accentDim: '#7C5CFC22',
  accentHov: '#9A7FFD',
  green:     '#22C97A',
  greenDim:  '#22C97A22',
  amber:     '#F5A623',
  red:       '#F04060',
  text:      '#F0F0F8',
  textSub:   '#8A8A9A',
  textMuted: '#55556A',
};

function Spinner({ size = 16 }) {
  return (
    <span style={{ width: size, height: size, border: `2px solid #ffffff44`, borderTop: `2px solid #fff`, borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block', flexShrink: 0 }} />
  );
}

const PAID_PLANS = ['starter', 'growth', 'pro'];

export default function PricingPage({ user, subscription }) {
  const [billing, setBilling] = useState('monthly');
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState('');

  const currentTier = subscription?.tier ?? 'free';

  const handleCheckout = async (planKey) => {
    const plan = PLANS[planKey];
    const priceId = billing === 'monthly' ? plan.stripePriceMonthly : plan.stripePriceAnnual;

    setLoading(planKey);
    setError('');

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user.id, userEmail: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      window.location.href = data.url;
    } catch (err) {
      setError(err.message);
      setLoading(null);
    }
  };

  return (
    <div style={{ padding: '48px 32px', maxWidth: 960, margin: '0 auto' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Heading ──────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ margin: '0 0 12px', fontSize: 32, fontWeight: 800, color: C.text }}>
          Simple, transparent pricing
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: C.textSub }}>
          14-day free trial on all paid plans. No credit card required to start.
        </p>
      </div>

      {/* ── Billing toggle ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginBottom: 40 }}>
        <button
          onClick={() => setBilling('monthly')}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: billing === 'monthly' ? C.accent : C.surfaceL, color: billing === 'monthly' ? '#fff' : C.textSub, transition: 'all .15s' }}
        >
          Monthly
        </button>
        <button
          onClick={() => setBilling('annual')}
          style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: billing === 'annual' ? C.accent : C.surfaceL, color: billing === 'annual' ? '#fff' : C.textSub, transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 8 }}
        >
          Annual
          {billing === 'annual' && (
            <span style={{ background: C.greenDim, color: C.green, fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, border: `1px solid ${C.green}44` }}>
              Save 2 months
            </span>
          )}
        </button>
        {billing === 'monthly' && (
          <span style={{ fontSize: 12, color: C.green, fontWeight: 600 }}>
            ↑ Save 2 months with Annual
          </span>
        )}
      </div>

      {/* ── Plan cards ───────────────────────────────────────────────────── */}
      {error && (
        <div style={{ background: '#F0406022', border: '1px solid #F0406044', borderRadius: 10, padding: '12px 18px', marginBottom: 24, color: C.red, fontSize: 13, textAlign: 'center' }}>
          ⚠ {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {PAID_PLANS.map(planKey => {
          const plan = PLANS[planKey];
          const isCurrent = currentTier === planKey;
          const isPopular = plan.popular;
          const price = billing === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
          const perMonthEquiv = billing === 'annual' ? Math.floor(plan.annualPrice / 12) : null;
          const isLoading = loading === planKey;

          return (
            <div
              key={planKey}
              style={{
                background: C.surface,
                border: `1px solid ${isPopular ? C.accent : C.border}`,
                borderRadius: 16,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                boxShadow: isPopular ? `0 0 0 1px ${C.accent}44, 0 8px 32px ${C.accent}22` : 'none',
              }}
            >
              {/* Popular banner */}
              {isPopular && (
                <div style={{ background: C.accent, color: '#fff', textAlign: 'center', fontSize: 11, fontWeight: 700, letterSpacing: '.8px', textTransform: 'uppercase', padding: '6px 0' }}>
                  Most Popular
                </div>
              )}

              <div style={{ padding: '28px 24px 24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                {/* Plan name */}
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 16 }}>
                  {plan.name}
                </div>

                {/* Price */}
                <div style={{ marginBottom: 24 }}>
                  {billing === 'annual' ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 36, fontWeight: 800, color: C.text }}>€{perMonthEquiv}</span>
                        <span style={{ fontSize: 14, color: C.textSub }}>/mo</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>
                        €{price} billed annually
                      </div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 36, fontWeight: 800, color: C.text }}>€{price}</span>
                      <span style={{ fontSize: 14, color: C.textSub }}>/mo</span>
                    </div>
                  )}
                </div>

                {/* Feature list */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: C.textSub }}>
                      <span style={{ color: C.green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <button
                  disabled={isCurrent || isLoading}
                  onClick={() => !isCurrent && !isLoading && handleCheckout(planKey)}
                  style={{
                    width: '100%',
                    padding: '12px 0',
                    borderRadius: 10,
                    border: 'none',
                    cursor: isCurrent || isLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    transition: 'all .15s',
                    opacity: isCurrent ? 0.55 : 1,
                    background: isCurrent ? C.surfaceL : isPopular ? C.accent : C.accentDim,
                    color: isCurrent ? C.textSub : isPopular ? '#fff' : C.accent,
                  }}
                >
                  {isLoading ? (
                    <><Spinner size={14} /> Redirecting…</>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    'Start free trial'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer note ──────────────────────────────────────────────────── */}
      <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: C.textMuted }}>
        All plans include a 14-day free trial. Cancel anytime. Prices in EUR.
      </p>
    </div>
  );
}
