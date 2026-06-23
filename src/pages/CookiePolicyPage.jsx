import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

const C = {
  bg:       '#0D0D12',
  surface:  '#16161E',
  surfaceL: '#1E1E28',
  border:   '#2A2A36',
  accent:   '#7C5CFC',
  green:    '#22C97A',
  greenDim: '#22C97A22',
  text:     '#F0F0F8',
  textSub:  '#8A8A9A',
  textMuted:'#55556A',
};

function Li({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 44 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, margin: '0 0 14px', paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}>
        {title}
      </h2>
      <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.85 }}>{children}</div>
    </section>
  );
}

export default function CookiePolicyPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={22} />
        </Link>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, color: C.textMuted }}>Cookie Policy</span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, margin: '0 0 10px' }}>Cookie Policy</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Last updated: 23 June 2026</p>
        </div>

        {/* Quick summary */}
        <div style={{ background: C.greenDim, border: `1px solid ${C.green}44`, borderRadius: 12, padding: '16px 20px', marginBottom: 44, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>✅</span>
          <div>
            <div style={{ fontWeight: 700, color: C.green, marginBottom: 4 }}>The short version</div>
            <div style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7 }}>
              We use <strong style={{ color: C.text }}>one essential authentication cookie</strong> required
              to keep you logged in, and — only with your explicit consent — analytics
              and marketing technologies (Google Analytics, Meta Pixel, and Meta
              Conversions API) to help us understand how the app is used and measure
              advertising performance. You can accept or decline these optional
              technologies at any time.
            </div>
          </div>
        </div>

        <Section title="1. What Is a Cookie?">
          <p>
            A cookie is a small text file placed on your device by a website when you visit it. Cookies are widely used
            to make websites work efficiently and to provide information to the site owner.
          </p>
        </Section>

        <Section title="2. The Cookie We Use">
          <p>
            ApexManager uses <strong style={{ color: C.text }}>one essential authentication cookie</strong>, set by our
            authentication provider, Supabase. This cookie is required for the service to function. Without it, you
            cannot stay logged in.
          </p>

          {/* Cookie table */}
          <div style={{ overflowX: 'auto', marginTop: 16 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Name', 'Provider', 'Purpose', 'Duration', 'Type'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: C.textMuted, fontWeight: 600, background: C.surfaceL, borderBottom: `1px solid ${C.border}`, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '12px 14px', color: C.text, fontFamily: 'monospace', fontSize: 12, borderBottom: `1px solid ${C.border}` }}>sb-[project]-auth-token</td>
                  <td style={{ padding: '12px 14px', color: C.textSub, borderBottom: `1px solid ${C.border}` }}>Supabase</td>
                  <td style={{ padding: '12px 14px', color: C.textSub, borderBottom: `1px solid ${C.border}` }}>Stores your encrypted authentication session so you remain logged in between page visits.</td>
                  <td style={{ padding: '12px 14px', color: C.textSub, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>Session / 1 week</td>
                  <td style={{ padding: '12px 14px', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ background: C.greenDim, color: C.green, padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700 }}>Essential</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 14 }}>
            This cookie does not track you across other websites. It contains only an encrypted session identifier —
            no personal data is readable from it.
          </p>
        </Section>

        <Section title="3. Cookies We Do Not Use">
          <p>
            We deliberately do not use any of the following:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <li style={{ marginBottom: 8 }}>✅ Analytics cookies (Google Analytics) — only with your consent</li>
            <li style={{ marginBottom: 8 }}>✅ Marketing pixels (Meta Pixel) — only with your consent</li>
            <li style={{ marginBottom: 8 }}>✅ Server-side conversion events (Meta Conversions API) — only with your consent</li>
            <li style={{ marginBottom: 8 }}>❌ Third-party advertising cookies without your consent</li>
            <li style={{ marginBottom: 8 }}>❌ Cross-site tracking cookies sold to third parties</li>
          </ul>
        </Section>

        <Section title="Analytics Cookies (Optional)">
          <p>
            With your consent, we use <strong style={{ color: C.text }}>
            Google Analytics</strong> to understand how visitors use
            ApexManager — which pages are visited, how long sessions last,
            and general usage patterns. This helps us improve the product.
          </p>
          <p>
            Google Analytics sets the following cookies when you consent:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li><code>_ga</code> — Distinguishes unique users. Expires after 2 years.</Li>
            <Li><code>_ga_[container-id]</code> — Persists session state. Expires after 2 years.</Li>
          </ul>
          <p>
            We have enabled IP anonymization, so Google Analytics does not
            store your full IP address. Data is processed by Google Ireland
            Limited under the EU-U.S. Data Privacy Framework.
          </p>
          <p>
            You can decline analytics cookies when you first visit, or
            change your choice at any time in{' '}
            <Link to="/settings" style={{ color: C.accent }}>Settings →
            Privacy &amp; Cookies</Link> (if logged in), or by clicking
            &quot;Cookie Policy&quot; in the footer to re-trigger the consent banner.
          </p>
        </Section>

        <Section title="Marketing Pixels &amp; Conversions API (Optional)">
          <p>
            With your consent, we use <strong style={{ color: C.text }}>Meta</strong> (Facebook/Instagram)
            marketing tools to measure whether our advertising is effective and to understand conversions such as
            sign-ups and subscriptions.
          </p>
          <p><strong style={{ color: C.text }}>Browser Pixel</strong></p>
          <p>
            The Meta Pixel runs in your browser when you consent. It may set:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li><code>_fbp</code> — Browser identifier used by Meta for attribution. Expires after 90 days.</Li>
            <Li><code>_fbc</code> — Stores click identifiers when you arrive from a Meta ad. Expires after 90 days.</Li>
          </ul>
          <p><strong style={{ color: C.text }}>Conversions API (server-side)</strong></p>
          <p>
            When you complete a conversion action (such as registering or subscribing), our server may also
            send a matching event to Meta. This improves measurement accuracy when browser tracking is limited.
            We only send these events if you have consented. Data sent may include:
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li>Event name and time (e.g. CompleteRegistration, Purchase)</Li>
            <Li>Page URL where the action occurred</Li>
            <Li>Your email address in hashed form (SHA-256 — Meta cannot read the plain email)</Li>
            <Li>IP address and browser user agent (for matching)</Li>
            <Li><code>_fbp</code> and <code>_fbc</code> cookie values when present</Li>
          </ul>
          <p>
            Browser and server events use a shared event ID so Meta counts each conversion once.
            Data is processed by <strong style={{ color: C.text }}>Meta Platforms Ireland Limited</strong>.
            See Meta&apos;s privacy policy for details on international transfers and your rights.
          </p>
        </Section>

        <Section title="4. Legal Basis">
          <p>
            Under the EU ePrivacy Directive and the GDPR, <strong style={{ color: C.text }}>essential cookies do not require
            consent</strong> because they are strictly necessary for a service you have explicitly requested. Our single
            authentication cookie falls into this category.
          </p>
          <p>
            Analytics cookies are <strong style={{ color: C.text }}>not
            essential</strong> and require your explicit, opt-in consent
            under the ePrivacy Directive and GDPR. We only load Google
            Analytics and marketing technologies (Google Analytics, Meta Pixel, and Meta Conversions API)
            after you click &quot;Accept All&quot; on our cookie banner.
            If you click &quot;Reject Analytics&quot; or take no action, these
            are never activated.
          </p>
        </Section>

        <Section title="5. How to Delete or Block Cookies">
          <p>
            You can delete or block cookies at any time through your browser settings. Note that deleting the
            authentication cookie will log you out of ApexManager.
          </p>
          <p style={{ marginTop: 12 }}>Instructions for common browsers:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: C.text }}>Chrome:</strong> Settings → Privacy and security → Cookies and other site data → See all site data and permissions → search for your domain → Delete
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: C.text }}>Firefox:</strong> Settings → Privacy &amp; Security → Cookies and Site Data → Manage Data
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: C.text }}>Safari:</strong> Preferences → Privacy → Manage Website Data
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: C.text }}>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data
            </li>
          </ul>
        </Section>

        <Section title="6. Changes to This Policy">
          <p>
            If we introduce new cookies or change how we use existing ones, we will update this policy,
            update the &quot;Last updated&quot; date, and — where required — ask for your consent again before
            loading any new non-essential cookies.
          </p>
        </Section>

        <Section title="7. Contact">
          <p>
            For any questions about our use of cookies, contact us at{' '}
            <a href="mailto:support@apexmanager.app" style={{ color: C.accent }}>support@apexmanager.app</a>.
          </p>
          <p>
            For more information about how we handle your personal data, see our{' '}
            <Link to="/privacy" style={{ color: C.accent }}>Privacy Policy</Link>.
          </p>
        </Section>
      </main>

      <footer style={{ borderTop: `1px solid ${C.border}`, background: C.surface, padding: '20px 40px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>© 2026 ApexManager. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/privacy" style={{ fontSize: 12, color: C.textMuted }}>Privacy</Link>
          <Link to="/terms" style={{ fontSize: 12, color: C.textMuted }}>Terms</Link>
          <Link to="/cookies" style={{ fontSize: 12, color: C.textMuted }}>Cookies</Link>
        </div>
      </footer>
    </div>
  );
}
