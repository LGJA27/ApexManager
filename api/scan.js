import { createClient } from "@supabase/supabase-js";

// Proxies Anthropic vision requests — set ANTHROPIC_API_KEY in Vercel env vars.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, imageType, prompt, systemPrompt, userId } = req.body ?? {};

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  if (!imageBase64 || !prompt) {
    return res.status(400).json({ error: "Missing imageBase64 or prompt" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Server misconfiguration: missing environment variables" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("tier, scan_limit, scans_used_this_month")
    .eq("user_id", userId)
    .maybeSingle();

  if (!sub || sub.tier === "free") {
    return res.status(403).json({ error: "AI scanning is not available on the Free plan." });
  }

  const used = sub.scans_used_this_month ?? 0;
  const limit = sub.scan_limit ?? 0;
  if (used >= limit) {
    return res.status(403).json({ error: "Scan limit reached for this billing period." });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Server misconfiguration: missing ANTHROPIC_API_KEY" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        system: systemPrompt || "You are a precise data extraction assistant for restaurant management. Return only valid JSON, no markdown, no preamble.",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: imageType || "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({
        error: `Anthropic API error: ${response.status}`,
        details: error,
      });
    }

    const data = await response.json();
    const text = data.content?.map(b => b.text || "").join("") || "";

    await supabase
      .from("subscriptions")
      .update({ scans_used_this_month: used + 1 })
      .eq("user_id", userId);

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("Scan API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
