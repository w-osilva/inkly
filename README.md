# inkly

**Open-source, privacy-first writing assistant for the browser** — local grammar & spelling that works offline and free, plus an optional AI layer for rewriting, translation, synonyms, and context analysis. A free alternative to Grammarly and LanguageTool.

> Status: early (v0.1.0). The local engine, suggestion UI, settings, i18n (English + Brazilian Portuguese), the BYOK AI suite (with streaming responses), and apply support across plain and framework rich editors all work end-to-end.

## Why

- **Local-first & private.** Spelling and grammar run on-device via [Harper](https://github.com/Automattic/harper) (Rust→WASM) — your text never leaves the browser for the always-on checks.
- **Free, for real.** The local engine costs nothing. The AI features are either on-device (Chrome built-in, when available) or use **your own API key** — inkly never runs a paid backend on your behalf.
- **Transparent & open.** Every flagged issue maps to a Harper rule, with explanations available in English and Portuguese.

## Features

- ✅ Real-time spelling & grammar underlines in `<textarea>`, `<input>`, and `contenteditable` (including multi-node editors like Gmail-style fields), color-coded by severity (correctness / clarity / suggestion).
- ✅ Hover a suggestion → explanation + one-click fix; "Add to dictionary" to stop flagging a word.
- ✅ Per-site and global on/off; rule-category toggles; personal dictionary.
- ✅ UI **and** rule explanations in English + Brazilian Portuguese (auto-detected, switchable).
- ✅ **AI (bring your own key):** select text → Rewrite / Translate / Synonyms / Analyze. Runtime tone & length controls; persistent default tone. Works with any OpenAI-compatible API (OpenAI, Groq, OpenRouter, Ollama, …). Opportunistically uses Chrome's built-in on-device AI when available.
- ✅ Invoke AI via the selection toolbar, a keyboard shortcut (Alt+I), or the right-click menu.
- ✅ **Streaming AI responses** — BYOK output appears incrementally as it generates.
- ✅ Precise underline positioning in `<textarea>`/`<input>` (mirror-div measurement) and one-click apply inside framework rich editors (ProseMirror / Lexical / Slate / Quill / CKEditor — validated end-to-end against ProseMirror).

## Install (development)

Requires Node 18+ and npm.

```bash
npm install
npm run build          # production build → .output/chrome-mv3/
```

Then load it unpacked:

- **Chrome / Edge / Brave:** open `chrome://extensions` (or `edge://`, `brave://`), enable **Developer mode**, **Load unpacked**, and select `.output/chrome-mv3/`.

Store-ready zips: `npm run zip`.

## Configure AI (optional)

The grammar checker needs no setup. For the AI features, open the extension's **Options** page (or the "AI settings…" link in the popup) and enter an OpenAI-compatible **endpoint**, **model**, and **API key**. The key is stored locally (`chrome.storage.local`) and never synced or sent anywhere except your chosen endpoint. If your Chrome has built-in AI (Gemini Nano) available, inkly uses it automatically — no key needed.

## Development

```bash
npm run dev            # WXT dev server with HMR (Chrome)
npm run dev -- -b edge # target Edge
npm test               # unit tests (Vitest)
npm run check          # type-check (svelte-check)
npm run test:e2e       # Playwright end-to-end (headed; uses a mock LLM)
```

## Architecture (brief)

- **Content script** (isolated world): detects editable fields, debounces checks, and renders custom underlines in a Shadow DOM overlay (vanilla DOM) plus Svelte cards/panels. Never injects into the host page's editable element.
- **Offscreen document** (extension origin): runs Harper's WASM engine (one shared instance across tabs, immune to page CSP) and the AI calls (Chrome built-in → BYOK fallback). The API key stays here / in the service worker, never in the page.
- **Service worker:** brokers messages between the content script and the offscreen document, manages the context menu and hotkey.
- **Suggestions** use a universal `(offset, length, replacements[], message, ruleId, category, severity)` shape, so engines plug in behind one interface.

Built with [WXT](https://wxt.dev), TypeScript, and Svelte 5.

## Contributing

Issues and PRs welcome. The codebase favors small, focused modules with unit tests (Vitest) and end-to-end tests (Playwright); `npm test`, `npm run check`, and `npm run test:e2e` should be green before merging.

## License

[MIT](./LICENSE) © Washington Silva. Bundles [Harper](https://github.com/Automattic/harper) (Apache-2.0).
