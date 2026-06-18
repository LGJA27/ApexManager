import { useState, useEffect } from 'react';

export default function InstallAppButton({ style }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const isIOS = /iphone|ipad|ipod/.test(
    window.navigator.userAgent.toLowerCase()
  );
  const isStandalone = window.matchMedia(
    '(display-mode: standalone)'
  ).matches || window.navigator.standalone;

  if (installed || isStandalone) return null;

  const handleClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSHint(true);
    }
  };

  if (!deferredPrompt && !isIOS) return null;

  return (
    <>
      <button type="button" onClick={handleClick} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'linear-gradient(135deg, #7C5CFC, #5B2FD4)',
        border: 'none', borderRadius: 10, color: '#fff',
        fontSize: 13, fontWeight: 700, padding: '10px 18px',
        cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,92,252,0.35)',
        ...style,
      }}>
        📲 Install App
      </button>

      {showIOSHint && (
        <div onClick={() => setShowIOSHint(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          zIndex: 2000,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#16161E', borderRadius: '20px 20px 0 0',
            padding: 24, maxWidth: 420, width: '100%',
            border: '1px solid #2A2A36', borderBottom: 'none',
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#F0F0F8', marginBottom: 12 }}>
              Install ApexManager on iPhone
            </div>
            <div style={{ fontSize: 14, color: '#8A8A9A', lineHeight: 1.8 }}>
              1. Tap the <strong style={{ color: '#F0F0F8' }}>Share</strong> button
              (square with an arrow) at the bottom of Safari<br />
              2. Scroll down and tap <strong style={{ color: '#F0F0F8' }}>&quot;Add to Home Screen&quot;</strong><br />
              3. Tap <strong style={{ color: '#F0F0F8' }}>&quot;Add&quot;</strong> in the top right
            </div>
            <button type="button" onClick={() => setShowIOSHint(false)} style={{
              marginTop: 18, width: '100%', padding: '12px 0',
              background: '#2A2A36', border: 'none', borderRadius: 10,
              color: '#F0F0F8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
