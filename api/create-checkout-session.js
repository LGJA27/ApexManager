import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { priceId, userId, userEmail } = req.body ?? {};

  if (!priceId || !userId || !userEmail) {
    return res.status(400).json({ error: "Missing required fields: priceId, userId, userEmail" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = process.env.VITE_APP_URL;

  if (!stripeSecretKey || !supabaseUrl || !supabaseServiceKey || !appUrl) {
    return res.status(500).json({ error: "Server misconfiguration: missing environment variables" });
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── Look up or create a Stripe customer ──────────────────────────────────
    let stripeCustomerId;

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.stripe_customer_id) {
      stripeCustomerId = existing.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      await supabase.from("subscriptions").upsert(
        { user_id: userId, stripe_customer_id: stripeCustomerId },
        { onConflict: "user_id" }
      );
    }

    // ── Create the Checkout Session ──────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgraded=true`,
      cancel_url: `${appUrl}/pricing`,
      subscription_data: { trial_period_days: 14 },
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[create-checkout-session]", err.message);
    return res.status(400).json({ error: err.message });
  }
}
