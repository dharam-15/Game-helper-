/**
 * GAME HELPER — serverless image-identification proxy.
 *
 * Same idea as ask.js: the API key stays on the server, the browser sends an
 * image and gets JSON back. The frontend "Use /api/vision" button points here.
 *
 * WHAT THE FRONTEND SENDS
 *   POST /api/vision
 *   { "model": "gpt-4o-mini", "max_tokens": 500,
 *     "messages": [{ "role": "user", "content": [
 *       { "type": "text", text": "..." },
 *       { "type": "image_url", image_url": { "url": "data:image/png;base64,..." } }
 *     ]}]}
 *
 * WHAT IT RETURNS
 *   { "item": "...", "game": "...", "category": "...", "confidence": 0.87,
 *     "description": "...", "howToUse": "..." }
 *
 * SETUP
 *   Set OPENAI_API_KEY in your host's environment variables.
 */

const SYSTEM_PROMPT =
  "You identify video game items from photos. Reply with ONLY a JSON object using exactly these keys: " +
  "item, game, category, confidence (a number between 0 and 1), description, howToUse. " +
  "If you are not confident, say so in the description and set confidence below 0.5. " +
  "Keep description and howToUse under 60 words each.";

exports.handler = async function (event) {
  if (event.httpMethod !== "POST") {
    return json(405, { error: { message: "Method not allowed" } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, { error: { message: "Vision is not configured on the server yet." } });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: { message: "Invalid JSON body" } });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return json(400, { error: { message: "No image supplied" } });
  }

  // Guard rail: reject anything that is not an inline image so this function
  // cannot be abused to fetch arbitrary URLs from the inside.
  const hasImage = JSON.stringify(messages).indexOf('"image_url"') !== -1;
  if (!hasImage) {
    return json(400, { error: { message: "No image found in the request" } });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: process.env.VISION_MODEL || "gpt-4o-mini",
        messages: [{ role: "system", content: SYSTEM_PROMPT }].concat(messages),
        max_tokens: Math.min(Number(body.max_tokens) || 500, 1200)
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) return json(upstream.status, data);

    // Pull the JSON object out of the model's reply and return it cleanly.
    const raw = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return json(502, { error: { message: "The model did not return a usable result." } });
    return json(200, JSON.parse(match[0]));
  } catch (err) {
    return json(502, { error: { message: "Could not reach the AI provider: " + err.message } });
  }
};

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}
