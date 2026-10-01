# GAME HELPER — README

**Your gaming information companion.** A fast, mobile-friendly gaming information assistant: search 20 games, browse weapons / characters / items / maps, ask a game assistant, run the Game Copilot, identify items from photos, compare anything, and keep a personal library. No framework, no build step, no tracking.

---

## 1. Run it right now (30 seconds, zero setup)

Open **`Game Helper.html`** in Chrome, Edge, Firefox or Safari. That is the whole installation.

It works completely offline. **Every feature listed in section 3 works with no account, no API key and no backend.**

---

## 2. What is in this folder

| File | What it is |
|---|---|
| `Game Helper.html` | The entire website. One self-contained file: HTML, CSS, JavaScript and all 20 games of data. |
| `netlify/functions/ask.js` | Serverless AI proxy — keeps your secret key **on the server**. |
| `netlify/functions/vision.js` | Serverless vision proxy — image identification without exposing a key. |
| `netlify/functions/gamedb.js` | Serverless game-database proxy (RAWG / IGDB compatible). |
| `netlify.toml` | Static hosting config + `/api/*` routing. |
| `README.md` | This file. |

You can delete `netlify/` and `netlify.toml` and the website still works perfectly. They exist only so you can switch on live services safely.

---

## 3. What works with ZERO external services

Everything below is fully implemented and runs today, offline, in this browser.

**Discover & browse**
- 20 complete game pages (GTA V, Minecraft, Free Fire, BGMI, Valorant, Fortnite, PUBG, Call of Duty, Elden Ring, God of War, CS2, Apex Legends, League of Legends, Genshin Impact, Red Dead Redemption 2, Cyberpunk 2077, Terraria, Clash of Clans, Marvel Rivals, Mobile Legends)
- 12 tabs per game: Overview · Characters · Weapons · Items · Maps · Vehicles · Events · Updates · Guides · Tips · System Requirements · Gallery
- ~700 searchable entities, generated cover art (pure SVG, zero image files)
- Browse hub for every category across all games
- Game comparison (2–3 games, 13 structured fields)
- **Item vs item comparison** across games, or within one game
- Related-games suggestions, always stating the shared genre as the reason

**Search**
- Typo-tolerant matching using Damerau–Levenshtein distance (`vandla` finds *Vandal*)
- Live suggestions, recent searches, category filter, game filter, match highlighting
- Searchable across games, characters, weapons, items, maps, vehicles, events, guides, tips and updates

**AI & Copilot**
- AI Helper chat with conversation history and a game-context selector
- **Game Copilot** with 8 quick-action buttons and a "What should I do next?" planner
- A real data-lookup engine: exact names, two-item comparisons, guides, tips, patch notes, system requirements, game explanations
- Honest "demo answer" labelling on every response
- Copy answer · save question · clear chat · ask for more detail

**Image Scanner**
- Real file upload (click, drag & drop), preview, type + 8 MB validation, remove/change
- Clearly-labelled **demo** analysis result, with a demo notice

**Personal**
- Favorites for games, weapons, characters, items, maps, vehicles and events
- Personal notes per game, editable in two places
- Recently viewed, recent searches, saved AI questions
- **Export / import JSON** to move or back up everything
- Dark + light theme, 6 languages (English, हिन्दी, اردو, বাংলা, தமிழ், Español) with full RTL for Urdu
- Mobile bottom navigation, 44 px touch targets, no horizontal scroll at 320 px
- 9 keyboard shortcuts, skip link, ARIA roles, focus rings, `prefers-reduced-motion`

**Honesty**
- A status bar under the header shows **DEMO or LIVE** for every data source and explains exactly what that means
- No feature ever claims to be live when it is not

---

## 4. What genuinely requires an external service

Only these four. Everything else in section 3 is already done.

| # | Feature | Needs | Where the code is |
|---|---|---|---|
| 1 | Live AI answers | An AI provider key **or** your own backend | `DataSource.askAI()` + `netlify/functions/ask.js` |
| 2 | Real image recognition | A vision model key **or** your own backend | `DataSource.identifyImage()` + `netlify/functions/vision.js` |
| 3 | Live game database | A game-data API key | `DataSource.getGame()` + `netlify/functions/gamedb.js` |
| 4 | Live news / YouTube / screenshots | Corresponding API keys | `DataSource.getUpdates()` + `API_CONFIG.future` |

> **Security:** never paste a secret key into `Game Helper.html`. Once the file is online, anyone can open DevTools and read it. Use the serverless functions below — the key stays in your host's environment.

---

## 5. Exact setup instructions

### Step 0 — deploy the static site (any host)

**Netlify (easiest, free):** go to [app.netlify.com/drop](https://app.netlify.com/drop) and drag this whole folder in. `netlify.toml` is picked up automatically. You get an HTTPS URL immediately.

**Vercel:**
```bash
npm i -g vercel
vercel
# Framework preset: Other · Build command: leave empty · Output directory: .
```

**GitHub Pages / any static host:** copy `Game Helper.html` to `index.html` at the repo root. Nothing else is required.

### Step 1 — add your keys as environment variables

In your host dashboard (Netlify: *Site settings → Environment variables*; Vercel: *Project settings → Environment variables*):

| Variable | Needed for | Where to get it |
|---|---|---|
| `OPENAI_API_KEY` | AI + vision | <https://platform.openai.com/api-keys> |
| `RAWG_API_KEY` | Live game database | <https://developer.rawg.com/apikey> |
| `YOUTUBE_API_KEY` | Trailers & guide videos | <https://developers.google.com/youtube/v3/getting-started> |

Optional: `OPENAI_MODEL`, `VISION_MODEL`, `GAMEDB_PROVIDER` to override the defaults.

After adding a variable, **redeploy** — environment variables are read at build/boot time.

### Step 2 — switch each feature on from the app

Open the site, then:

- **AI / Copilot** → *Settings* → AI connection → **🔐 Use my own backend** (sets endpoint to `/api/ask`, leaves the key blank) → **Save settings** → **Test connection**.
- **Image Scanner** → *Settings* → Vision connection → tick **Use the vision API** → **🔐 Use /api/vision** → save.
- **Game data** → edit `API_CONFIG.future.gameDatabaseApi` in the source to `"/api/games"`.

The DEMO chips in the status bar flip to **LIVE** the moment each one actually works.

### Step 3 — use a provider directly (optional, no backend)

If you are testing locally and do not care about key exposure, you can point the app straight at a provider in *Settings*:

| Provider | Endpoint | Model |
|---|---|---|
| OpenAI | `https://api.openai.com/v1/chat/completions` | `gpt-4o-mini` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | `gemini-2.0-flash` |
| Custom | anything that accepts an OpenAI-shaped JSON body | — |

⚠️ OpenAI and Gemini require CORS. OpenAI allows browser calls; **Gemini does not** — for Gemini use the `/api/ask` proxy instead.

### What each endpoint receives

```
POST /api/ask      { "model": "...", "messages": [...], "max_tokens": 700 }
                   → { "choices": [{ "message": { "content": "..." } }] }

POST /api/vision   { "messages": [{ "role": "user", "content": [
                     { "type": "text", text: "..." },
                     { "type": "image_url", image_url: { "url": "data:image/png;base64,..." } }]}]}
                   → { "item": "...", "game": "...", "category": "...",
                       "confidence": 0.87, "description": "...", "howToUse": "..." }

GET  /api/games/:id  → the game record in GAME HELPER's own shape
```

The serverless functions normalise all three, so the frontend never needs to know which provider you used.

---

## 6. Adding a game

Find `const GAMES = [` and copy any object inside it. Every view — cards, search, browse, compare, the AI, the Copilot — reads from that one array, so a new game appears everywhere at once with no other edit.

```js
{
  id: "my-game",                 // unique slug, used in the URL
  name: "My Game",
  glyph: "MG",                   // 1–2 characters drawn on the generated cover
  c1: "#ff6600", c2: "#110a04",  // cover colours (no image files needed)
  developer: "Studio", publisher: "Publisher",
  releaseDate: { year: "2025", platform: "PC", note: "extra detail line" },
  platforms: ["PC", "Mobile"], genre: ["Action"],
  rating: 8.0, tags: ["tag1", "tag2"],
  desc: "One paragraph.",
  charTerm: "Characters",         // optional: renames that tab
  weaponTerm: "Weapons",         // optional: renames that tab
  characters: [ e("Name", "Role", "Rarity", "Description.") ],
  weapons:   [ /* ... */ ], items: [ /* ... */ ], maps: [ /* ... */ ],
  vehicles:  [ /* ... */ ], events: [ /* ... */ ],
  updates:   [ { title, date, type, points: [] } ],
  guides:    [ { title, body, type: "beginner" } ],
  tips:      [ "Short tip.", "..." ],
  requirements: { minimum: { CPU: "...", RAM: "..." }, recommended: { ... } }
}
```

`guide.type` accepts `beginner`, `advanced`, `character`, `weapon`, `item`, `map`, `mission`, `tip`.

---

## 7. Adding a language

1. Add the new strings as a `newCode: [...]` array in `I18N`, in the **exact same order** as `E2_KEYS`.
2. Add one line to `LANGUAGES`: `{ code: "xx", native: "Native name", label: "English name", dir: "ltr" }`.
3. For a right-to-left language use `dir: "rtl"` — the layout mirrors automatically.

If the counts drift, the console prints a warning and the missing strings fall back to English, so a partial translation is never broken.

> Interface text is translated. **Game content stays in English** by design — translating ~700 game descriptions is a separate content project, and mixing translated chrome with English game data is the honest, consistent choice.

---

## 8. Keyboard shortcuts

| Key | Action |
|---|---|
| `/` | Jump to search |
| `g` then `h` / `g` / `a` / `f` / `u` / `s` | Home / Games / AI / Favorites / Updates / Search |
| `t` | Toggle dark & light mode |
| `r` | Open a random game |
| `?` | Show all shortcuts |
| `Esc` | Close menus and dialogs |

---

## 9. Data & privacy

Favorites, notes, chat history, recent searches, theme and language are stored in this browser's `localStorage` only. Nothing is uploaded, no cookies, no analytics, no fingerprinting. **About → Erase my local data** clears everything with one click, and *Export JSON* gives you a backup first.

Game content is editorial **demo** data for a prototype: ratings, patch notes and loadout advice are illustrative, not official. Verify anything important on the official source. The status bar under the header always states which parts are demo and which are live.

---

Made with plain HTML, CSS and JavaScript. No frameworks, no bundler, no dependencies.
