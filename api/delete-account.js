import { createClient } from "@supabase/supabase-js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization." });
  }

  const token = authHeader.slice(7);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey || supabaseServiceKey.includes("your_service_role")) {
    console.error("[delete-account] SUPABASE_SERVICE_ROLE_KEY is not configured");
    return res.status(500).json({ error: "Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY." });
  }

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: "Invalid or expired session. Please sign in again." });
  }

  const userId = user.id;

  try {
    // Venues CASCADE to sales, invoices, expenses tied to venue_id
    const { error: venuesError } = await supabaseAdmin.from("venues").delete().eq("user_id", userId);
    if (venuesError) throw venuesError;

    const tables = ["suppliers", "stock_items", "staff", "subscriptions"];
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
      if (error) throw error;
    }

    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteUserError) throw deleteUserError;

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[delete-account]", err.message);
    return res.status(500).json({ error: "Failed to delete account. Please try again or contact support." });
  }
}
