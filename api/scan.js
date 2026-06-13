export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, imageType, prompt, systemPrompt } = req.body ?? {};

  if (!prompt) {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY is not configured" });
  }

  const userContent = imageBase64
    ? [
        {
          type: "image",
          source: { type: "base64", media_type: imageType || "image/jpeg", data: imageBase64 },
        },
        { type: "text", text: prompt },
      ]
    : prompt;

  const body = {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: userContent }],
  };

  if (systemPrompt) body.system = systemPrompt;

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return res.status(upstream.status).json({ error: text });
    }

    const data = await upstream.json();
    const result = data.content?.map((b) => b.text ?? "").join("") ?? "";
    return res.status(200).json({ result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
