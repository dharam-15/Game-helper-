/**
 * GAME HELPER — serverless AI proxy (Netlify Functions, also works on Vercel).
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * A .html file is public. If you put an OpenAI key in frontend JavaScript,
 * anyone can open DevTools and steal it. This function holds the key in an
 * environment variable instead, and the browser only ever talks to this URL.
 *
 * WHAT THE FRONTEND SENDS   (OpenAI-compatible shape, so the UI needs no changes)
 *   POST /api/ask
 *   { "model": "gpt-4o-mini", "messages": [...], "max_tokens": 700 }
 *
 * WHAT IT RETURNS
 *   { "choices": [{ "message": { "content": "..." } }] }
 *
 * SETUP
 *   1. In your host dashboard add an environment variable:
 *        OPENAI_API_KEY = sk-...
 *   2. Deploy. Done — the frontend's "Use my own backend" button points here.
 */

exports.handler = async function (event) {
  // Only allow POST.
  if (event.httpMethod !== "POST") {
    return json(405, { error: { message: "Method not allowed" } });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return json(503, {
      error: {
        message: "Server is not configured. Set the OPENAI_API_KEY environment variable and redeploy."
      }
    });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch (err) {
    return json(400, { error: { message: "Invalid JSON body" } });
  }

  // Never let the browser choose the model — that would be an open proxy.
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return json(400, { error: { message: "No messages supplied" } });
  }

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + apiKey
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: Math.min(Number(body.max_tokens) || 700, 2000)
      })
    });

    const data = await upstream.json();
    // Pass the provider's own error through so the UI can show something useful.
    return json(upstream.status, data);
  } catch (err) {
    return json(502, { error: { message: "Could not reach the AI provider: " + err.message } });
  }
};

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      // Allow the same site to call this. Tighten to your real domain when live.
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}
