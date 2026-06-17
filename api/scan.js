// Proxies Anthropic vision requests — set ANTHROPIC_API_KEY in Vercel env vars.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64, imageType, prompt, systemPrompt } = req.body ?? {};

  console.log("Scan request received, image size:",
    imageBase64 ? Math.round(imageBase64.length / 1024) + "KB" : "none");
  console.log("API key present:", !!process.env.ANTHROPIC_API_KEY);

  if (!imageBase64 || !prompt) {
    return res.status(400).json({ error: "Missing imageBase64 or prompt" });
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

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error("Scan API error:", error);
    return res.status(500).json({ error: error.message });
  }
}
