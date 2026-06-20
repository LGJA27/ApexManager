import { Resend } from "resend";

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, email, subject, message, source } = req.body ?? {};

  if (!email || !message) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: "Invalid email address" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("Contact form: RESEND_API_KEY is not configured");
    return res.status(500).json({ error: "Failed to send message. Please try again." });
  }

  const from = process.env.CONTACT_FROM_EMAIL || "ApexManager <noreply@apexmanager.app>";
  const to = process.env.CONTACT_TO_EMAIL || "support@apexmanager.app";
  const safeName = escapeHtml(name || "—");
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject || "—");
  const safeMessage = escapeHtml(message);
  const safeSource = escapeHtml(source || "Contact");
  const subjectLine = `[${source || "Contact"}] ${subject || "New message"} — from ${name || email}`;

  try {
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: subjectLine.slice(0, 200),
      html: `
        <div style="font-family: sans-serif; max-width: 560px;">
          <h2 style="color: #7C5CFC;">New ${safeSource} message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: #f5f5f5; padding: 12px; border-radius: 8px;">${safeMessage}</p>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Contact form email error:", error);
    return res.status(500).json({ error: "Failed to send message. Please try again." });
  }
}
