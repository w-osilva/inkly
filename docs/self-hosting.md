# Self-hosting Inkly's AI & LanguageTool

Inkly works out of the box with free, hosted tiers. This guide is for running the optional
layers **entirely on your own machine** — no key, no cost, no third party, nothing leaving
your device. Pair both and you get a fully open + local stack:

> **Harper (offline) + self-hosted LanguageTool + Ollama** — no third party at all.

---

## Run AI locally with Ollama (free & private)

Want the AI features (Improve, Rewrite, Synonyms, Define, Translate) with **no key, no cost,
and nothing leaving your machine**? Run [Ollama](https://ollama.com) with an open model.
**`gemma3:4b`** is a great default for English + Portuguese; it needs ~3–4 GB of VRAM (a 6 GB
GPU is plenty). On lighter hardware use **`qwen2.5:3b`**.

1. **Install** Ollama (ollama.com) and pull a model:
   ```bash
   ollama pull gemma3:4b
   ```
2. **Allow the extension to reach Ollama.** Ollama blocks cross-origin requests by default, so
   you must allow the extension origin via `OLLAMA_ORIGINS` — this is the one step people miss:
   - **macOS / Linux:**
     ```bash
     OLLAMA_ORIGINS='chrome-extension://*' ollama serve
     ```
   - **Windows (PowerShell):** the app usually runs already, so set it persistently and restart
     Ollama from the tray:
     ```powershell
     setx OLLAMA_ORIGINS "chrome-extension://*"
     # then quit Ollama from the system tray and reopen it
     ```
   Verify it's up: `curl http://localhost:11434/api/tags`.
3. In **Options → AI provider** pick **Ollama** and set the model to exactly what you pulled
   (e.g. `gemma3:4b`). Done — fully local, free, private.

> **Tip:** the first request loads the model into memory (a little slow); subsequent ones are
> fast. Bigger models = better suggestions but more VRAM — `gemma3:4b` is the sweet spot for
> most laptops. `qwen3` also works (its reasoning output is handled), but it's slower.

---

## Self-host LanguageTool (Docker + n-grams)

By default LanguageTool uses the public API (`api.languagetool.org`), which is rate-limited
(~20 req/min, ~20 KB/request) and sees your text. Running it locally removes both limits and
keeps everything on your machine — the **rules are the same open-source engine**, so detection
quality matches the public API (it does **not** unlock Premium rules).

```bash
docker run -d --name languagetool -p 8010:8010 erikvl87/languagetool
```

Then set **Options → LanguageTool → endpoint** to `http://localhost:8010/v2`. Inkly fetches
LanguageTool from the service worker (host permission), so `localhost` works; **Picky** mode
behaves the same.

**For parity with the public API**, add the optional **n-gram data** — it powers
context-sensitive confusion rules (*their/there*, *its/it's*). Without it a local server is
slightly weaker on those. Download a language's n-gram set from the
[LanguageTool n-gram page](https://dev.languagetool.org/finding-errors-using-n-gram-data),
mount it, and point the engine at it:

```bash
docker run -d --name languagetool -p 8010:8010 \
  -v /path/to/ngrams:/ngrams \
  -e langtool_languageModel=/ngrams \
  erikvl87/languagetool
```
