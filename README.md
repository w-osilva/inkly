<div align="center">

# ✒️ Inkly

**The open, private, free writing assistant for your browser.**

Grammar, spelling, punctuation, style, and AI rewriting — across the whole web.
A genuine alternative to Grammarly and LanguageTool that you actually control.

`local-first` · `privacy-first` · `open-source` · `bring-your-own-AI` · `no account` · `no subscription`

</div>

---

## Why Inkly

Most writing assistants make you choose: **powerful** (Grammarly — closed, paid, your text on their servers) or **open** (LanguageTool — open-core, but the good stuff is Premium). Inkly's bet is that you shouldn't have to.

- 🔒 **Private by default.** Grammar & spelling run **on your device** ([Harper](https://github.com/Automattic/harper), Rust→WASM, offline). The always-on checks never touch a server. No account, no telemetry, no paid backend — ever.
- 🆓 **Free, for real.** On-device correction costs nothing. The AI layer runs on **your own key** (or a free tier, or fully local via Ollama) — Inkly never bills you and never runs inference on your behalf.
- 🎛️ **You're in control.** Turn engines on/off, **reorder their priority**, pick your AI provider, point at a self-hosted server. Your tools, your rules.
- 🌍 **Multilingual.** Interface in **9 languages**; correction in **~30** (LanguageTool auto-detects). Harper is English-only, so on non-English text it steps aside and lets LanguageTool lead — no false flags.
- 🧩 **Open.** MIT-licensed; Harper is fully open-source and bundled. Want a 100% open + local stack? Run **Harper (offline) + self-hosted LanguageTool (Docker) + Ollama** — no third party at all.

## What it does

### ✍️ Correction (always on, no key needed)
- Real-time spelling, grammar & punctuation underlines in `<textarea>`, `<input>`, and `contenteditable` (Gmail-style multi-node editors included), color-coded by severity.
- Click an underline → explanation + one-click fix. Add words to a personal dictionary.
- **A configurable stack of engines**, merged into one clean set of underlines:
  | Engine | What | Where |
  |---|---|---|
  | **Harper** | grammar, spelling, agreement, capitalization | 🔒 on-device, offline |
  | **Punctuation** | spacing & repeated-mark rules Harper misses | 🔒 on-device |
  | **LanguageTool** | richer grammar/spelling/punctuation **+ style**, ~30 languages | ☁ server (public API or self-hosted) |
  | **Proofreader** | on-device AI proofreading | 🔒 where the browser ships it |
  | **AI suggestions** | what rules can't catch — word choice, clarity, awkward phrasing | 🔒/☁ your provider |
- **Reorderable priority:** when two engines flag the same span, the one you rank higher wins. Toggle any off.
- **Picky mode** (one click): unlocks LanguageTool's advanced style/wordiness checks (the kind LanguageTool gates behind Premium) — free, via the public API.

### 🤖 AI, on your terms (select text → act)
- **Rewrite** with a **tone slider** (Casual ↔ Formal), optional **style** (Confident · Technical · Simple), and **length** (shorter ↔ longer).
- **Improve** — inline suggestions for clarity & word choice that rules miss (e.g. *"to eating"* → *"to eat"*), shown right under the text.
- **Synonyms** (AI: context-aware, grouped by sense → free thesaurus fallback when AI is unavailable), **Define** (free dictionary API → AI fallback, in your language), **Translate** (into your UI language).
- Streaming responses. Invoke via the selection toolbar, **Alt+I**, or the right-click menu.
- **Bring your own provider** — any OpenAI-compatible API: OpenAI, **Groq**, OpenRouter, Anthropic, Gemini, **Ollama** (local). Keys are stored per-provider, locally, and sent only to the endpoint you chose. Privacy labels (`no-train` / `local`) help you pick.
- Uses Chrome's **built-in on-device AI** (Gemini Nano / Rewriter / Proofreader) automatically when available — free and private.

### 🛡️ Privacy & freedom, concretely
- Grammar/spelling stay on-device. The provider you configure is used **only** when you click an AI action (or for opt-in LanguageTool).
- LanguageTool is opt-in-configurable and **self-hostable** (Docker) for zero third-party egress.
- Settings & dictionary sync across your devices via the browser — not our servers.
- No sign-in. No tracking. No "upgrade to unlock."

## Inkly vs LanguageTool vs Grammarly (honest take)

| | Inkly | LanguageTool | Grammarly |
|---|---|---|---|
| Core correction | Harper + LanguageTool | LanguageTool (open-core) | proprietary |
| Open-source | ✅ (MIT; Harper fully open) | ⚠️ open-core (Premium closed) | ❌ |
| Works offline | ✅ (Harper) | self-hosted only | ❌ |
| Privacy / no account | ✅ | partial | ❌ |
| AI rewrite/paraphrase | ✅ your key (unlimited) | Premium | ✅ (paid) |
| Price | **free** (AI = your key) | freemium | freemium/paid |
| Raw engine maturity | young | mature | most mature |
| Configurable engines & priority | ✅ | ❌ | ❌ |

Inkly stands on LanguageTool's shoulders for raw rules and complements them with on-device Harper and your-own-AI. It doesn't out-correct Grammarly's proprietary engine — it wins on **openness, privacy, control, languages, and cost**.

## Install

Requires Node 18+ and npm.

```bash
npm install
npm run build          # production build → .output/chrome-mv3/
```

Load it unpacked in **Chrome / Edge / Brave**: open `chrome://extensions`, enable **Developer mode** → **Load unpacked** → select `.output/chrome-mv3/`. Store-ready zips: `npm run zip`.

## Configure AI (optional)

Correction works with zero setup. For the AI features, open **Options** (the "Tools & AI…" link in the popup), pick a provider, and paste a key. The key lives in `chrome.storage.local` and is sent only to your chosen endpoint. With Chrome's built-in AI available, no key is needed. For a fully open/local AI, run **Ollama** and select it.

## Self-host LanguageTool (optional)

By default LanguageTool uses the public API (`api.languagetool.org`), which is rate-limited (~20 req/min, ~20 KB/request) and sees your text. Running it locally removes both limits and keeps everything on your machine — the **rules are the same open-source engine**, so detection quality matches the public API (it does **not** unlock Premium rules).

```bash
docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool
```

Then set **Options → LanguageTool → endpoint** to `http://localhost:8010/v2`. Inkly fetches LanguageTool from the service worker (host permission), so `localhost` works; **Picky** mode behaves the same.

**For parity with the public API**, add the optional **n-gram data** — it powers context-sensitive confusion rules (*their/there*, *its/it's*). Without it a local server is slightly weaker on those. Download a language's n-gram set from the [LanguageTool n-gram page](https://dev.languagetool.org/finding-errors-using-n-gram-data), mount it, and point the engine at it:

```bash
docker run -d --name languagetool -p 8010:8010 \
  -v /path/to/ngrams:/ngrams \
  -e langtool_languageModel=/ngrams \
  erikvl87/languagetool
```

A fully open + local stack is then **Harper (offline) + self-hosted LanguageTool + Ollama** — no third party at all.

## Development

```bash
npm run dev                 # WXT dev server with HMR (Chrome)
npm test                    # unit tests (Vitest)
npm run check               # type-check (svelte-check)
npm run test:e2e            # Playwright e2e (headed; mock LLM)
npm run test:e2e:headless   # same, windowless (CI / WSL)
```

## Architecture (brief)

- **Content script** (isolated world): detects fields, debounces checks, merges suggestions from all enabled engines by priority, and renders underlines + Svelte cards/panels in a Shadow DOM overlay promoted to the browser top layer (so page popovers can't cover it). Never injects into the host's editable element.
- **Offscreen document** (extension origin): runs Harper's WASM engine (one shared instance, CSP-immune) and AI calls (on-device → BYOK).
- **Service worker:** brokers messages, fetches LanguageTool (host-permission, no page CORS), manages the menu and hotkey.
- **Suggestions** share one `(offset, length, replacements[], message, ruleId, category, severity, source)` shape, so any engine plugs in behind one interface and the merge dedupes overlaps by source priority.

Built with [WXT](https://wxt.dev), TypeScript, and Svelte 5.

## Contributing

Issues and PRs welcome — including **translations** (`src/core/i18n.ts`) and **rule descriptions**. Keep `npm test`, `npm run check`, and `npm run test:e2e` green before merging.

## License

[MIT](./LICENSE) © Washington Silva. Bundles [Harper](https://github.com/Automattic/harper) (Apache-2.0). Optional integrations: [LanguageTool](https://languagetool.org) (LGPL core), and any OpenAI-compatible AI provider you configure.
