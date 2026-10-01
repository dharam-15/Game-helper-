/**
 * GAME HELPER — serverless game-database proxy (Netlify Functions / Vercel).
 *
 * WHY THIS EXISTS
 * ---------------
 * The frontend has an adapter (DataSource.getGame) that fetches a game record
 * and falls back to the bundled demo data when nothing is configured. Point it
 * at "/api/games/<id>" and this function serves real data without the browser
 * ever seeing an API key.
 *
 *   GET /api/games/valorant
 *     → { id, name, developer, publisher, releaseDate, platforms, genre, rating,
 *         tags, desc, characters[], weapons[], items[], maps[], vehicles[],
 *         events[], updates[], guides[], tips[], requirements{} }
 *
 *   GET /api/games?q=minecraft&limit=20
 *     → { results: [ { id, name, ... } ] }   (for a real search screen)
 *
 * SETUP
 *   Set RAWG_API_KEY in your host's environment variables.
 *   Provider defaults to RAWG; set GAMEDB_PROVIDER=igdb for IGDB.
 *
 *   RAWG free tier: https://developer.rawg.com/apikey   (no key => demo mode)
 *   IGDB: needs a Twitch OAuth token; see https://api-docs.igdb.com
 */

const PROVIDERS = {
  // RAWG returns close to the shape we want, so it is a light pass-through.
  rawg: {
    base: "https://api.rawg.io/api/games",
    keyHeader: "RAWG_API_KEY",
    list: p => p + "?key=" + p, // replaced below
    build: raw => ({
      id: raw.slug || String(raw.id),
      name: raw.name,
      developer: (raw.developers || []).map(d => d.name).join(", ") || "Unknown",
      publisher: (raw.publishers || []).map(d => d.name).join(", ") || "Unknown",
      releaseDate: { year: (raw.released || "").slice(0, 4) || "?", platform: (raw.platforms || []).map(p => p.platform.name).join(", ") || "Unknown" },
      platforms: (raw.platforms || []).map(p => p.platform.name),
      genre: (raw.genres || []).map(g => g.name),
      rating: Number(((raw.metacritic || 0) / 10) || raw.rating || 0).toFixed(1),
      tags: (raw.tags || []).map(t => t.name).slice(0, 6),
      desc: raw.description_raw || raw.description || "No description provided by the API.",
      // The fields below have no free public equivalent. Returning them as empty
      // arrays is deliberate: the UI then shows an honest empty state instead of
      // inventing data. Merge your own curated content for these.
      characters: [], weapons: [], items: [], maps: [], vehicles: [], events: [],
      updates: [], guides: [], tips: [],
      requirements: { minimum: { "Provider": "not supplied by " + "the API" }, recommended: {} }
    })
  },
  igdb: {
    // IGDB needs a Twitch app token, so it is intentionally left as a template.
    // Fill in base, keyHeader and build() for your account and it drops straight in.
    base: "",
    keyHeader: "IGDB_CLIENT_ID",
    build: () => ({})
  }
};

exports.handler = async function (event) {
  const providerName = (process.env.GAMEDB_PROVIDER || "rawg").toLowerCase();
  const provider = PROVIDERS[providerName];
  if (!provider || !provider.base) {
    return json(501, { error: { message: 'Unsupported provider "' + providerName + '".' } });
  }
  const key = process.env[provider.keyHeader];
  if (!key) {
    return json(503, { error: { message: "Game data is not configured. Set " + provider.keyHeader + " and redeploy." } });
  }

  const parts = (event.path || "").replace(/^\/*api\/games\/*/, "").split("/").filter(Boolean);
  const qs = event.queryStringParameters || {};

  try {
    // ---- list / search: /api/games?q=valorant ----
    if (!parts.length || qs.q) {
      const url = provider.base + "?key=" + encodeURIComponent(key) +
        (qs.q ? "&search=" + encodeURIComponent(qs.q) : "") +
        "&page_size=" + Math.min(Number(qs.limit) || 20, 40);
      const data = await get(url);
      return json(200, { results: (data.results || []).map(provider.build) });
    }

    // ---- single game: /api/games/valorant ----
    const slug = decodeURIComponent(parts[0]);
    const url = provider.base + "/" + encodeURIComponent(slug) + "?key=" + encodeURIComponent(key);
    const data = await get(url);
    if (!data || !data.name) return json(404, { error: { message: "No game found for id " + slug + "." } });
    return json(200, provider.build(data));
  } catch (err) {
    return json(502, { error: { message: "Game provider error: " + err.message } });
  }
};

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (res.status === 429) throw new Error("rate limited — try again shortly");
    if (res.status === 401 || res.status === 403) throw new Error("API key rejected");
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function json(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}
