import crypto from "crypto";

const ALLOWED_EVENTS = new Set([
  "CompleteRegistration",
  "Purchase",
  "StartTrial",
]);

function hashEmail(email) {
  if (!email || typeof email !== "string") return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const accessToken = process.env.META_CONVERSIONS_API_TOKEN;
  const pixelId = process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID;

  if (!accessToken || !pixelId) {
    console.error("[meta-conversion] Missing META_CONVERSIONS_API_TOKEN or META_PIXEL_ID");
    return res.status(500).json({ error: "Server misconfiguration: missing Meta CAPI credentials." });
  }

  const { eventName, eventId, eventSourceUrl, customData, email, fbp, fbc } = req.body ?? {};

  if (!eventName || !eventId || !ALLOWED_EVENTS.has(eventName)) {
    return res.status(400).json({ error: "Invalid or unsupported event." });
  }

  const userData = {};
  const hashedEmail = hashEmail(email);
  if (hashedEmail) userData.em = [hashedEmail];

  const clientIp = getClientIp(req);
  if (clientIp) userData.client_ip_address = clientIp;

  const userAgent = req.headers["user-agent"];
  if (userAgent) userData.client_user_agent = userAgent;

  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const eventPayload = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: String(eventId),
    action_source: "website",
    user_data: userData,
  };

  if (eventSourceUrl) eventPayload.event_source_url = eventSourceUrl;
  if (customData && typeof customData === "object" && Object.keys(customData).length > 0) {
    eventPayload.custom_data = customData;
  }

  const body = {
    data: [eventPayload],
    access_token: accessToken,
  };

  if (process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error("[meta-conversion] Meta API error:", result);
      return res.status(502).json({ error: "Failed to send event to Meta." });
    }

    return res.status(200).json({
      success: true,
      events_received: result.events_received ?? 0,
    });
  } catch (err) {
    console.error("[meta-conversion]", err.message);
    return res.status(500).json({ error: "Failed to send event to Meta." });
  }
}
