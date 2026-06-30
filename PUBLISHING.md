# Publishing Inkly to the browser stores

Inkly is built with [WXT](https://wxt.dev); `npm run zip` produces a store-ready package.
This guide covers the **Chrome Web Store** (primary) and **Microsoft Edge Add-ons** — both
take the same MV3 build.

## 0. Before every release

1. **Bump the version** in `package.json` (`"version"`). WXT writes it into the manifest;
   the store rejects a re-upload with an unchanged version.
2. Make sure CI is green (`npm run check`, `npm test`, `npm run test:e2e:headless`).
3. Build the package:
   ```bash
   npm run zip          # → .output/inkly-<version>-chrome.zip
   ```

## 1. Chrome Web Store

### One-time setup
- Register at the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) — a **one-time US$5** registration fee.
- Verify your account / set up the publisher.

### Submit
1. **Add new item** → upload `.output/inkly-<version>-chrome.zip`.
2. **Store listing:** title, summary, full description, **category** (Productivity), language,
   at least one **screenshot** (1280×800 or 640×400), 128px icon (already in the manifest),
   optional 440×280 promo tile.
3. **Privacy practices** (this is the part that needs care — see below).
4. **Submit for review.** Review typically takes a few days; `<all_urls>` extensions get
   extra scrutiny.

### Privacy & permissions — read this
The store will ask you to justify permissions and declare data handling. Be accurate:

- **`host_permissions: <all_urls>` + content script on all sites** — justify: *"A writing
  assistant must read and underline text in editable fields on any website the user types
  on."* This is the single biggest review factor; keep the justification crisp.
- **`storage`** — settings, per-site toggles, personal dictionary, AI config.
- **`offscreen`** — run the Harper WASM grammar engine off the page.
- **`contextMenus`** — the right-click "Improve with Inkly" entry.
- **Data usage declaration.** Inkly handles **website content** (the text the user types).
  Declare honestly:
  - Grammar/spelling run **on-device** (Harper) — not transmitted.
  - Text **is sent to a server only** when (a) LanguageTool is enabled (default endpoint
    `api.languagetool.org`, or the user's self-hosted server), or (b) the user invokes an AI
    action, which goes to **their own configured provider**.
  - Inkly does **not** sell data, does **not** use it for ads, and runs **no** backend of its own.
- **A privacy policy URL is required.** Host one (e.g. a `PRIVACY.md` on GitHub Pages or the
  repo) and link it. It must state the above.
- **No remote code.** Inkly bundles everything; the CSP allows `wasm-unsafe-eval` only for the
  bundled Harper WASM — that's permitted, but mention it isn't remote code if asked.

> **Launch decision to make:** LanguageTool is **on by default** and sends text to the public
> API. That's disclosed in the UI, but for the cleanest first-review privacy story you may
> prefer to ship with it **off by default** (Harper-only out of the box, opt-in for
> LanguageTool/AI). Flip `DEFAULT_SETTINGS.correctionDisabled` in `src/core/settings.ts` if so.

## 2. Microsoft Edge Add-ons

- Register at the [Microsoft Partner Center](https://partner.microsoft.com/dashboard/microsoftedge) — **free**, no fee.
- **Submit new extension** → upload the **same** `.output/inkly-<version>-chrome.zip` (Edge runs Chromium MV3).
- Fill the same listing + privacy details. Edge's review is usually faster than Chrome's.

## 3. Firefox (optional, later)

WXT can target Firefox (`npm run zip:firefox` → `.output/inkly-<version>-firefox.zip`) for
[addons.mozilla.org](https://addons.mozilla.org). Note: Firefox's MV3 / offscreen-document
support differs from Chromium and may need adjustment before it works end-to-end.

## 4. Optional: automated publishing

To publish from CI on a tag, use [`chrome-webstore-upload-cli`](https://github.com/fregante/chrome-webstore-upload-cli):

1. Create OAuth credentials (Client ID/Secret) + a refresh token for the Web Store API.
2. Store them as GitHub secrets (`CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`, `CWS_EXTENSION_ID`).
3. Add a release workflow that runs `npm run zip` then `chrome-webstore-upload upload --source .output/*-chrome.zip --auto-publish`.

Keep manual submission until the listing/screenshots/privacy policy are stable; automate once it's routine.
