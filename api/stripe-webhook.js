import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Vercel: disable built-in body parsing so we get the raw bytes Stripe needs
// for signature verification.
export const config = { api: { bodyParser: false } };

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Map a Stripe Price ID → { tier, venueLimit, scanLimit } */
function tierFromPriceId(priceId) {
  const map = {
    [process.env.VITE_STRIPE_PRICE_STARTER_MONTHLY]: { tier: "starter", venueLimit: 1,   scanLimit: 999999 },
    [process.env.VITE_STRIPE_PRICE_STARTER_ANNUAL]:  { tier: "starter", venueLimit: 1,   scanLimit: 999999 },
    [process.env.VITE_STRIPE_PRICE_GROWTH_MONTHLY]:  { tier: "growth",  venueLimit: 3,   scanLimit: 999999 },
    [process.env.VITE_STRIPE_PRICE_GROWTH_ANNUAL]:   { tier: "growth",  venueLimit: 3,   scanLimit: 999999 },
    [process.env.VITE_STRIPE_PRICE_PRO_MONTHLY]:     { tier: "pro",     venueLimit: 999, scanLimit: 999999 },
    [process.env.VITE_STRIPE_PRICE_PRO_ANNUAL]:      { tier: "pro",     venueLimit: 999, scanLimit: 999999 },
  };
  return map[priceId] ?? null;
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 1. Read raw body (required for Stripe signature verification)
  let rawBody;
  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("[stripe-webhook] Failed to read body:", err.message);
    return res.status(400).json({ error: "Could not read request body" });
  }

  // 2. Verify Stripe signature
  const sig = req.headers["stripe-signature"];
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err.message);
    return res.status(400).json({ error: `Webhook signature invalid: ${err.message}` });
  }

  // 3. Supabase admin client (service role bypasses RLS)
  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // 4. Handle events
  try {
    switch (event.type) {

      // ── checkout.session.completed ──────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object;

        // Retrieve the full subscription object from Stripe
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription
        );
        const priceId = subscription.items.data[0]?.price?.id;
        const tierInfo = tierFromPriceId(priceId);

        if (!tierInfo) {
          console.warn("[stripe-webhook] Unknown price ID:", priceId);
          break;
        }

        // Find the user via the customer ID we stored during checkout
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", session.customer)
          .maybeSingle();

        if (!sub?.user_id) {
          console.error("[stripe-webhook] No subscription row for customer:", session.customer);
          break;
        }

        await supabase
          .from("subscriptions")
          .update({
            tier: tierInfo.tier,
            stripe_subscription_id: subscription.id,
            status: "active",
            venue_limit: tierInfo.venueLimit,
            scan_limit: tierInfo.scanLimit,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("user_id", sub.user_id);

        console.log(`[stripe-webhook] Activated ${tierInfo.tier} for user ${sub.user_id}`);
        break;
      }

      // ── customer.subscription.updated ──────────────────────────────────────
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const priceId = subscription.items.data[0]?.price?.id;
        const tierInfo = tierFromPriceId(priceId);

        const update = {
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        };

        // If Stripe tells us the tier changed (e.g. upgrade/downgrade), apply it
        if (tierInfo) {
          update.tier = tierInfo.tier;
          update.venue_limit = tierInfo.venueLimit;
          update.scan_limit = tierInfo.scanLimit;
        }

        // past_due / unpaid: leave tier in place but reflect the degraded status
        // (the app layer can check status !== 'active' to gate features)

        await supabase
          .from("subscriptions")
          .update(update)
          .eq("stripe_subscription_id", subscription.id);

        console.log(`[stripe-webhook] Updated subscription ${subscription.id} → ${subscription.status}`);
        break;
      }

      // ── customer.subscription.deleted ──────────────────────────────────────
      case "customer.subscription.deleted": {
        const subscription = event.data.object;

        await supabase
          .from("subscriptions")
          .update({
            tier: "free",
            status: "canceled",
            venue_limit: 1,
            scan_limit: 10,
            stripe_subscription_id: null,
            current_period_end: null,
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`[stripe-webhook] Canceled subscription ${subscription.id} → reverted to free`);
        break;
      }

      default:
        // Unhandled event types are silently ignored
        break;
    }
  } catch (err) {
    console.error(`[stripe-webhook] Error handling ${event.type}:`, err.message);
    // Still return 200 so Stripe doesn't retry indefinitely for logic errors
    return res.status(200).json({ received: true, warning: err.message });
  }

  return res.status(200).json({ received: true });
}
