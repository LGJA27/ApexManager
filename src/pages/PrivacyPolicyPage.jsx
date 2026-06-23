import { Link } from 'react-router-dom';
import Logo from '../components/Logo.jsx';

const C = {
  bg:       '#0D0D12',
  surface:  '#16161E',
  border:   '#2A2A36',
  accent:   '#7C5CFC',
  text:     '#F0F0F8',
  textSub:  '#8A8A9A',
  textMuted:'#55556A',
};

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

function Li({ children }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

export default function PrivacyPolicyPage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      {/* Minimal nav */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={22} />
        </Link>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, color: C.textMuted }}>Privacy Policy</span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, margin: '0 0 10px' }}>Privacy Policy</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Last updated: 23 June 2026</p>
        </div>

        <Section title="1. Who We Are">
          <p>
            ApexManager is a business management SaaS for small and medium businesses operated by <strong style={{ color: C.text }}>Luis G. Jardim</strong>,
            a sole trader (trabalhador independente) registered in Portugal.
          </p>
          <ul style={{ paddingLeft: 20, margin: '10px 0' }}>
            <Li><strong style={{ color: C.text }}>Trader:</strong> Luis G. Jardim</Li>
            <Li><strong style={{ color: C.text }}>Address:</strong> Funchal, Portugal</Li>
            <Li><strong style={{ color: C.text }}>NIF:</strong> 260932361</Li>
            <Li><strong style={{ color: C.text }}>Email:</strong> <a href="mailto:support@apexmanager.app" style={{ color: C.accent }}>support@apexmanager.app</a></Li>
          </ul>
          <p>
            We are the data controller for the personal data you provide when using ApexManager. This policy explains what
            data we collect, how we use it, and your rights under the General Data Protection Regulation (GDPR).
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p><strong style={{ color: C.text }}>Account data</strong></p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li>Your full name and email address, provided during registration.</Li>
            <Li>An encrypted password (we never see it in plain text).</Li>
          </ul>
          <p><strong style={{ color: C.text }}>Business data you enter</strong></p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li>Venue names, addresses, and contact details.</Li>
            <Li>Supplier information (name, NIF, IBAN, address, phone).</Li>
            <Li>Invoice data extracted from uploaded images (supplier, items, prices, tax).</Li>
            <Li>Daily sales logs (cash, card, notes, staff names you enter).</Li>
            <Li>Expense records and stock cost data.</Li>
          </ul>
          <p><strong style={{ color: C.text }}>Usage data</strong></p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li>Page views and feature interactions, collected via Google Analytics and Meta (browser Pixel and Conversions API) only if you have given consent via our cookie banner.</Li>
            <Li>For marketing attribution, with your consent we may send hashed email, IP address, browser user agent, and cookie identifiers to Meta for conversion matching.</Li>
            <Li>Authentication session metadata (login timestamps, session tokens).</Li>
          </ul>
          <p><strong style={{ color: C.text }}>Payment data</strong></p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li>Subscription status and billing period (stored by us).</Li>
            <Li>Card numbers, CVV, and banking details are processed exclusively by Stripe. We never see, store, or have access to your card information.</Li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <Li>To provide, operate, and improve the ApexManager service.</Li>
            <Li>To authenticate your identity and maintain your session.</Li>
            <Li>To process subscription payments through Stripe.</Li>
            <Li>To send transactional emails (e.g., account confirmation, password reset).</Li>
            <Li>To respond to support requests.</Li>
            <Li>To measure advertising performance and optimize campaigns (only with your consent, via Google Analytics and Meta).</Li>
          </ul>
          <p style={{ marginTop: 14 }}>
            We do not sell, rent, or share your personal data with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="4. How We Store Your Data">
          <p>
            All data is stored on <strong style={{ color: C.text }}>Supabase</strong>, a PostgreSQL-based database platform with servers
            located in the <strong style={{ color: C.text }}>European Union (Frankfurt, Germany)</strong>.
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li>Data is <strong style={{ color: C.text }}>encrypted at rest</strong> using AES-256.</Li>
            <Li>Data is <strong style={{ color: C.text }}>encrypted in transit</strong> using TLS 1.2+.</Li>
            <Li>Database access is protected by Row Level Security (RLS) — each user can only access their own data.</Li>
          </ul>
        </Section>

        <Section title="5. Data Processors (Sub-processors)">
          <p>We work with the following third-party data processors. Each is bound by a Data Processing Agreement:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li>
              <strong style={{ color: C.text }}>Supabase, Inc.</strong> — Database and authentication hosting.
              Servers located in the EU. <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Supabase Privacy Policy →</a>
            </Li>
            <Li>
              <strong style={{ color: C.text }}>Stripe, Inc.</strong> — Payment processing. Stripe is PCI DSS Level 1 certified.
              <a href="https://stripe.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.accent }}> Stripe Privacy Policy →</a>
            </Li>
            <Li>
              <strong style={{ color: C.text }}>Anthropic, PBC</strong> — AI invoice scanning. When you scan an invoice,
              the image is sent to Anthropic's Claude API for processing. Images are transmitted over TLS and are not
              stored or used for AI training by Anthropic under our enterprise agreement.
              AI-extracted data may contain errors and should be reviewed by the user before relying on it for accounting or tax purposes.
              <a href="https://www.anthropic.com/privacy" target="_blank" rel="noreferrer" style={{ color: C.accent }}> Anthropic Privacy Policy →</a>
            </Li>
            <Li>
              <strong style={{ color: C.text }}>Google Ireland Limited
              (Google Analytics)</strong> — Website usage analytics, only
              active with your consent. Data is processed under the EU-U.S.
              Data Privacy Framework. IP addresses are anonymized.{' '}
              <a href="https://policies.google.com/privacy" target="_blank"
              rel="noreferrer" style={{ color: C.accent }}> Google Privacy
              Policy →</a>
            </Li>
            <Li>
              <strong style={{ color: C.text }}>Meta Platforms Ireland Limited
              (Meta Pixel &amp; Conversions API)</strong> — Marketing and conversion
              measurement, only active with your consent. We send conversion events
              from your browser (Pixel) and from our server (Conversions API) to
              measure sign-ups and subscriptions from advertising. Data may include
              hashed email, IP address, browser user agent, page URL, and Meta cookie
              identifiers (_fbp, _fbc). Data may be transferred to Meta in the United
              States under Meta&apos;s standard contractual clauses.{' '}
              <a href="https://www.facebook.com/privacy/policy/" target="_blank"
              rel="noreferrer" style={{ color: C.accent }}> Meta Privacy
              Policy →</a>
            </Li>
          </ul>
        </Section>

        <Section title="6. Your Rights Under GDPR">
          <p>As a data subject in the European Union, you have the following rights:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li><strong style={{ color: C.text }}>Right of access</strong> — You can request a copy of the personal data we hold about you.</Li>
            <Li><strong style={{ color: C.text }}>Right to rectification</strong> — You can correct inaccurate personal data at any time from your account settings.</Li>
            <Li><strong style={{ color: C.text }}>Right to erasure</strong> — You can request deletion of your account and all associated data.</Li>
            <Li><strong style={{ color: C.text }}>Right to data portability</strong> — You can export your data in a machine-readable format upon request.</Li>
            <Li><strong style={{ color: C.text }}>Right to object</strong> — You can object to the processing of your personal data in certain circumstances.</Li>
            <Li><strong style={{ color: C.text }}>Right to restrict processing</strong> — You can request that we limit how we use your data.</Li>
            <Li><strong style={{ color: C.text }}>Right to withdraw consent</strong> — Where we rely on your consent (such as for analytics cookies), you may withdraw that consent at any time without affecting the lawfulness of processing before its withdrawal.</Li>
          </ul>
          <p style={{ marginTop: 14 }}>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:support@apexmanager.app" style={{ color: C.accent }}>support@apexmanager.app</a>.
            We will respond within 30 days.
          </p>
          <p>
            You also have the right to lodge a complaint with your national data protection authority. In Portugal, this is the{' '}
            <strong style={{ color: C.text }}>CNPD</strong> (Comissão Nacional de Proteção de Dados).
          </p>
        </Section>

        <Section title="7. Data Retention">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <Li>Account and business data is retained for as long as your account is active.</Li>
            <Li>Upon account deletion, all personal data is permanently deleted within <strong style={{ color: C.text }}>30 days</strong>.</Li>
            <Li>Financial transaction records (invoices, subscription history) may be retained for up to <strong style={{ color: C.text }}>7 years</strong> to comply with Portuguese tax law.</Li>
          </ul>
        </Section>

        <Section title="8. Cookies">
          <p>
            We use a single <strong style={{ color: C.text }}>essential authentication cookie</strong> set by Supabase to maintain your logged-in session.
            This cookie is strictly necessary for the service to function and does not require consent under ePrivacy Directive rules.
          </p>
          <p>
            With your explicit consent, we also use <strong style={{ color: C.text }}>Google Analytics</strong>, the{' '}
            <strong style={{ color: C.text }}>Meta Pixel</strong> (browser), and the{' '}
            <strong style={{ color: C.text }}>Meta Conversions API</strong> (server-side) to understand how the app is used and measure marketing performance.
            Server-side conversion events are only sent when you have consented and only for key actions such as registration and subscription purchase.
            These optional technologies are never loaded or activated unless you click &quot;Accept All&quot; on our cookie banner.
            You can change your choice at any time in Settings → Privacy &amp; Cookies.
          </p>
          <p>
            We do not sell your personal data to third-party trackers.
            See our <Link to="/cookies" style={{ color: C.accent }}>Cookie Policy</Link> for full details.
          </p>
        </Section>

        <Section title="9. Changes to This Policy">
          <p>
            We may update this policy from time to time. When we do, we will update the "Last updated" date at the top of this page.
            For significant changes, we will notify you by email.
          </p>
        </Section>

        <Section title="10. Contact">
          <p>
            For any privacy-related questions or to exercise your GDPR rights, contact us at:
          </p>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginTop: 8 }}>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>Luis G. Jardim</div>
            <div>Funchal, Portugal</div>
            <div>NIF: 260932361</div>
            <div style={{ marginTop: 6 }}>
              <a href="mailto:support@apexmanager.app" style={{ color: C.accent }}>support@apexmanager.app</a>
            </div>
          </div>
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
