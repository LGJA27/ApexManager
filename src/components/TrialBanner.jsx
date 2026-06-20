import { useState } from 'react';
import { useSubscriptionGate } from '../hooks/useSubscriptionGate.js';

const C = {
  text: '#F0F0F8',
  textSub: '#8A8A9A',
};

export default function TrialBanner({ subscription, onPricing, hideAction = false }) {
  const { isTrial, trialDaysLeft } = useSubscriptionGate(subscription);
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('trialBannerDismissed') === '1');
  const daysLeft = trialDaysLeft();

  if (!isTrial || daysLeft === null || dismissed) return null;

  const dismiss = () => {
    sessionStorage.setItem('trialBannerDismissed', '1');
    setDismissed(true);
  };

  return (
    <div style={{
      background: daysLeft <= 2
        ? 'linear-gradient(135deg, #F0406011, #F0406008)'
        : 'linear-gradient(135deg, #7C5CFC11, #5B2FD408)',
      border: `1px solid ${daysLeft <= 2 ? '#F0406033' : '#7C5CFC33'}`,
      borderRadius: 10,
      padding: '10px 16px',
      marginBottom: 16,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{daysLeft <= 2 ? '⏰' : '✨'}</span>
        <span style={{ fontSize: 12.5, color: C.text }}>
          <strong>{daysLeft} day{daysLeft !== 1 ? 's' : ''} left</strong> in your free trial —
          you have full Growth-tier access. Subscribe to keep it.
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {!hideAction && onPricing && (
          <button type="button" onClick={onPricing} style={{
            background: 'linear-gradient(135deg, #7C5CFC, #5B2FD4)',
            border: 'none', borderRadius: 7, color: '#fff',
            fontSize: 12, fontWeight: 700, padding: '7px 14px',
            cursor: 'pointer', whiteSpace: 'nowrap',
          }}>
            Choose a Plan ⚡
          </button>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss" style={{
          background: 'none', border: 'none', color: C.textSub,
          cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px',
        }}>×</button>
      </div>
    </div>
  );
}
