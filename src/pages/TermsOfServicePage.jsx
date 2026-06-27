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

export default function TermsOfServicePage() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <style>{`* { box-sizing: border-box; } body { margin: 0; }`}</style>

      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface, padding: '0 40px', height: 56, display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <Logo size={22} />
        </Link>
        <span style={{ color: C.border }}>·</span>
        <span style={{ fontSize: 13, color: C.textMuted }}>Terms of Service</span>
      </nav>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px 80px' }}>
        <div style={{ marginBottom: 44 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: C.text, margin: '0 0 10px' }}>Terms of Service</h1>
          <p style={{ fontSize: 13, color: C.textMuted, margin: 0 }}>Last updated: June 2026</p>
        </div>

        <Section title="1. The Service">
          <p>
            ApexManager is a cloud-based business management platform operated by <strong style={{ color: C.text }}>Luis G. Jardim</strong>
            , NIF 260932361, a sole trader (trabalhador independente) registered in Portugal ("we", "us", "our"). The platform provides tools for
            AI-powered invoice scanning, daily sales tracking, expense management, supplier directories, product
            cost tracking, and business analytics designed for small and medium businesses.
          </p>
          <p>
            By creating an account and using ApexManager, you agree to be bound by these Terms of Service. If you
            do not agree, do not use the service.
          </p>
        </Section>

        <Section title="2. Eligibility">
          <p>
            You must be at least 18 years old and legally capable of entering a binding contract to use this service.
            By registering, you represent that you meet these requirements and that all information you provide is
            accurate and current.
          </p>
        </Section>

        <Section title="3. Acceptable Use">
          <p>ApexManager is licensed for use as a business management tool. You agree that you will:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li>Use the service only for lawful small business management purposes.</Li>
            <Li>Not resell, sublicense, or white-label the service to third parties without our prior written consent.</Li>
            <Li>Not attempt to reverse-engineer, scrape, or extract data from our platform programmatically.</Li>
            <Li>Not upload content that is illegal, fraudulent, or infringes the rights of third parties.</Li>
            <Li>Not attempt to gain unauthorised access to other users' data or to our infrastructure.</Li>
            <Li>Not use the AI invoice scanning feature to process documents unrelated to your business operations.</Li>
          </ul>
          <p>
            We reserve the right to investigate suspected violations and to terminate accounts that breach these rules.
          </p>
        </Section>

        <Section title="4. Free Trial">
          <p>
            New accounts receive a <strong style={{ color: C.text }}>7-day free trial</strong> with full Growth-tier features.
            No credit card is required to start the trial.
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0' }}>
            <Li>When the trial ends, your account automatically reverts to the Free plan unless you subscribe to a paid plan.</Li>
            <Li>Paid subscriptions are charged immediately when you choose a plan — there is no second or extended trial on paid plans.</Li>
            <Li>Each user is entitled to one free trial per email address.</Li>
          </ul>
        </Section>

        <Section title="5. Subscription and Billing">
          <p>
            Paid plans are billed either <strong style={{ color: C.text }}>monthly</strong> or{' '}
            <strong style={{ color: C.text }}>annually</strong>, depending on the plan you select.
          </p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li><strong style={{ color: C.text }}>Auto-renewal:</strong> Subscriptions renew automatically at the end of each billing period unless cancelled before the renewal date.</Li>
            <Li><strong style={{ color: C.text }}>Cancellation:</strong> You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end of the current billing period. You will retain access until that date.</Li>
            <Li><strong style={{ color: C.text }}>No refunds for partial months:</strong> We do not issue refunds or credits for partial billing periods, unused features, or downgraded plans.</Li>
            <Li><strong style={{ color: C.text }}>Price changes:</strong> We may change subscription prices with 30 days' notice via email. Continuing to use the service after the notice period constitutes acceptance of the new price.</Li>
            <Li><strong style={{ color: C.text }}>Payment processing:</strong> All payments are processed by Stripe. By subscribing, you also agree to <a href="https://stripe.com/legal" target="_blank" rel="noreferrer" style={{ color: C.accent }}>Stripe's Terms of Service</a>.</Li>
          </ul>
          <p>
            All prices are in EUR and include applicable VAT where required by Portuguese and EU law.
          </p>
        </Section>

        <Section title="6. Plan Limits">
          <p>
            Each subscription plan includes specific limits on the number of venues and AI invoice scans per month.
            These limits are displayed on the Pricing page and in your account. If you exceed your plan limits,
            certain features will be restricted until the next billing cycle or until you upgrade.
          </p>
        </Section>

        <Section title="7. Intellectual Property">
          <p>
            All content, trademarks, software, and design of the ApexManager platform are owned by or licensed to us.
            You may not copy, modify, distribute, or create derivative works without our express written permission.
          </p>
          <p>
            You retain full ownership of all data you enter into ApexManager (invoices, sales data, supplier information, etc.).
            You grant us a limited licence to process and store that data solely for the purpose of providing the service.
          </p>
        </Section>

        <Section title="8. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, our total liability to you for any claims arising from your use of
            ApexManager is limited to the <strong style={{ color: C.text }}>total amount you paid in the three months
            preceding the claim</strong>.
          </p>
          <p>
            We are not liable for: indirect or consequential losses; loss of profit or revenue; loss of data (beyond
            what is covered by our backup policy); or any business decisions made based on data shown in the platform.
          </p>
          <p>
            ApexManager is a management tool. It does not constitute professional financial, accounting, or legal advice.
          </p>
        </Section>

        <Section title="9. AI-Powered Features">
          <p>
            <strong style={{ color: C.text }}>AI-Powered Features:</strong> ApexManager uses artificial intelligence to
            extract data from photographs of invoices and receipts. While designed for accuracy, AI extraction may produce
            errors, especially with low-quality images. Users are responsible for reviewing and verifying all
            AI-extracted data before relying on it for business, accounting, or tax purposes. ApexManager is not liable
            for financial decisions made based on unverified AI-extracted data.
          </p>
        </Section>

        <Section title="10. Account Suspension and Termination">
          <p>We may suspend or terminate your account immediately if you:</p>
          <ul style={{ paddingLeft: 20, margin: '6px 0 14px' }}>
            <Li>Violate any provision of these Terms.</Li>
            <Li>Fail to pay any amounts due for more than 14 days.</Li>
            <Li>Engage in fraudulent or abusive use of the platform or AI features.</Li>
            <Li>Provide false registration information.</Li>
          </ul>
          <p>
            You may terminate your account at any time by contacting us at <a href="mailto:support@apexmanager.app" style={{ color: C.accent }}>support@apexmanager.app</a>.
            Upon termination, your data will be deleted within 30 days in accordance with our{' '}
            <Link to="/privacy" style={{ color: C.accent }}>Privacy Policy</Link>.
          </p>
        </Section>

        <Section title="11. Service Availability">
          <p>
            We aim to provide a reliable service but cannot guarantee 100% uptime. We may perform scheduled maintenance,
            which we will endeavour to notify you of in advance. We are not liable for any losses arising from service
            interruptions outside our reasonable control.
          </p>
        </Section>

        <Section title="12. Changes to These Terms">
          <p>
            We may update these Terms at any time. We will notify you of material changes by email at least 14 days
            before they take effect. Continued use of the service after the effective date constitutes acceptance of
            the revised Terms.
          </p>
        </Section>

        <Section title="13. Governing Law and Disputes">
          <p>
            These Terms are governed by and construed in accordance with the laws of <strong style={{ color: C.text }}>Portugal</strong>,
            without regard to conflict of law provisions.
          </p>
          <p>
            Any disputes arising from or relating to these Terms or the use of ApexManager shall be subject to the
            exclusive jurisdiction of the <strong style={{ color: C.text }}>courts of Lisbon, Portugal</strong>.
          </p>
          <p>
            Nothing in this clause affects your statutory rights as a consumer under Portuguese or EU consumer law.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>For any questions about these Terms, contact us at:</p>
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
