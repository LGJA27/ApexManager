import { useTranslation } from 'react-i18next';

const C = {
  accent: "#7C5CFC",
  text: "#F0F0F8",
  textSub: "#8A8A9A",
  green: "#22C97A",
};

export default function UpgradePrompt({ open, onClose, feature, setPage, venueLimit = 1 }) {
  const { t } = useTranslation();
  if (!open || !feature) return null;

  const copyByFeature = {
    range: {
      title: t('common.upgradeToUnlock'),
      description: t('dashboard.freePlanBanner'),
    },
    export: {
      title: t('common.upgradeToUnlock'),
      description: t('analytics.exportCSV'),
    },
    audit: {
      title: t('audit.title'),
      description: t('audit.subscribeTounlock'),
    },
    venueLocked: {
      title: t('venueLock.modalTitle'),
      description: t('venueLock.modalDescription', { count: venueLimit }),
    },
    multiScan: {
      title: "Batch invoice scanning",
      description: "Batch scanning multiple invoices at once is available on Growth and Pro plans.",
    },
  };

  const { title, description } = copyByFeature[feature] || copyByFeature.range;
  const showFeatureList = feature !== 'venueLocked' && feature !== 'multiScan';

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#16161E",
          border: "1px solid #7C5CFC",
          borderRadius: 16,
          padding: 32,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 16, color: feature === 'venueLocked' ? '#F5A623' : C.accent }}>
          {feature === 'venueLocked' ? '🔒' : '⚡'}
        </div>
        <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 800, color: C.text }}>{title}</h2>
        <p style={{ margin: "0 0 24px", fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>{description}</p>
        {showFeatureList && (
          <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {["Unlimited date ranges", "All data exports", "Full audit reports + charts"].map(item => (
              <li key={item} style={{ fontSize: 14, color: C.textSub, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: C.green, fontWeight: 700 }}>✓</span>{item}
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={() => { setPage("pricing"); onClose(); }}
          style={{
            width: "100%",
            padding: "13px 0",
            borderRadius: 10,
            border: "none",
            background: C.accent,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t('venueLock.seePlans')}
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 0",
            marginTop: 8,
            borderRadius: 10,
            border: "1px solid #2A2A36",
            background: "transparent",
            color: C.textSub,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {t('venueLock.maybeLater')}
        </button>
        {showFeatureList && (
          <div style={{ fontSize: 12, color: C.textSub, marginTop: 16, opacity: 0.8 }}>{t('common.freeTrial')}</div>
        )}
      </div>
    </div>
  );
}
