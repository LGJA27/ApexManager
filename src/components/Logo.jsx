/**
 * Logo component — the real favicon icon + "Apex Manager" wordmark.
 *
 * The icon is served directly from /favicon.svg so it is pixel-perfect
 * identical to the favicon at every size — same paths, same colours,
 * same glow effects. No redrawing, no colour drift.
 *
 * The favicon has a natural 48×46 aspect ratio; width is kept proportional.
 *
 * Props:
 *   size      {number}           Icon height in px.    Default: 32
 *   showText  {boolean}          Show the wordmark.    Default: true
 *   variant   {'dark'|'light'}   Wordmark text colour. Default: 'dark'
 */
export default function Logo({ size = 32, showText = true, variant = 'dark' }) {
  // Favicon natural size is 48 wide × 46 tall
  const iconWidth = Math.round(size * (48 / 46));
  const textColor = variant === 'light' ? '#0D0D12' : '#F0F0F8';
  const fontSize  = size * 0.56;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: size * 0.35,
      flexShrink: 0,
    }}>
      {/* Exact favicon — same file the browser tab uses */}
      <img
        src="/favicon.svg"
        width={iconWidth}
        height={size}
        alt="ApexManager icon"
        draggable={false}
        style={{ display: 'block', flexShrink: 0 }}
      />

      {showText && (
        <span style={{
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          fontSize,
          lineHeight: 1,
          letterSpacing: '-0.3px',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        }}>
          <span style={{ fontWeight: 700, color: textColor }}>Apex</span>
          <span style={{ fontWeight: 300, color: '#863bff' }}>Manager</span>
        </span>
      )}
    </div>
  );
}
