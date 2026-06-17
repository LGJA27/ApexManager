// IMPORTANT: Before this works, enable the Customer Portal in Stripe:
// Stripe Dashboard → Settings → Billing → Customer Portal
// Toggle it ON and configure which features to show:
// - Cancel subscription: ON
// - Update payment method: ON
// - View invoice history: ON
// - Update billing address: ON
// Save the configuration.
// The portal URL is managed entirely by Stripe — no extra code needed.

import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: "Missing required field: userId" });
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
    const { data } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .single();

    if (!data?.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account found" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${appUrl}/dashboard`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[create-portal-session]", err.message);
    return res.status(400).json({ error: err.message });
  }
}
