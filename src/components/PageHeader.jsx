import VenueChip from "./VenueChip.jsx";

const C = { text: "#F0F0F8" };

function titleSize(isMobile, isTablet, isWide) {
  if (isMobile) return 19;
  if (isTablet) return 24;
  return isWide ? 30 : 28;
}

/**
 * Page title + venue chip (desktop). On mobile the title/chip live in MobileHeader;
 * this component only renders action buttons on small screens when provided.
 */
export default function PageHeader({
  title,
  venue,
  venues,
  onVenueChange,
  isMobile,
  isTablet,
  isWide,
  actions,
  marginBottom,
  titleOnly = false,
}) {
  const mb = marginBottom ?? (isMobile ? 16 : 24);

  const titleBlock = (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: isMobile ? 8 : 12 }}>
      <h1 style={{ margin: 0, fontSize: titleSize(isMobile, isTablet, isWide), color: C.text }}>{title}</h1>
      <VenueChip venue={venue} venues={venues} onVenueChange={onVenueChange} />
    </div>
  );

  if (titleOnly) {
    if (isMobile) return null;
    return <div style={{ marginBottom: mb }}>{titleBlock}</div>;
  }

  if (isMobile) {
    if (!actions) return null;
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: mb, flexWrap: "wrap" }}>
        {actions}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: mb }}>
      {titleBlock}
      {actions}
    </div>
  );
}
