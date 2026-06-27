import { LocalLinter, Dialect, createBinaryModuleFromUrl, type Linter } from 'harper.js';
import type { PlainLint, OffscreenLintRequest, LintResponse } from '../../core/providers/harper-messages';
import { hasKey } from '../../core/ai/ai-config';
import { buildMessages } from '../../core/ai/prompts';
import { buildHttpRequest } from '../../core/ai/openai-provider';
import { splitSSE, deltaFromEvent } from '../../core/ai/sse';
import type { AIConfig, AIRequest, AIResponse } from '../../core/ai/ai-types';
import { tryChromeAI } from '../../core/ai/chrome-ai';
import { tryChromeTranslate } from '../../core/ai/chrome-translator';

let linter: Linter | null = null;
let setupPromise: Promise<void> | null = null;

function ensureLinter(): Linter {
  if (!linter) {
    // Offscreen is an extension page → it can fetch its own resources without
    // web_accessible_resources. The wasm lives in public/wasm/ (see copy script).
    // `as never`: the wasm is copied into public/wasm/ at build time, so it's
    // not in WXT's generated PublicPath union — the runtime path is verified by e2e.
    const wasmUrl = browser.runtime.getURL('wasm/harper_wasm_bg.wasm' as never);
    const binary = createBinaryModuleFromUrl(wasmUrl);
    linter = new LocalLinter({ binary, dialect: Dialect.American });
    setupPromise = linter.setup();
  }
  return linter;
}

async function lint(text: string): Promise<PlainLint[]> {
  const l = ensureLinter();
  await setupPromise;
  // organizedLints groups the same lints by their per-rule PascalCase name.
  const organized = await l.organizedLints(text, { language: 'plaintext' });
  const out: PlainLint[] = [];
  for (const [ruleName, lints] of Object.entries(organized)) {
    for (const lint of lints) {
      const span = lint.span();
      const suggestions = lint.suggestions();
      out.push({
        start: span.start,
        end: span.end,
        replacements: suggestions.map((s) => s.get_replacement_text()),
        message: lint.message(),
        kind: lint.lint_kind(),
        ruleName,
      });
      // free wasm-backed objects after reading (mirrors the prior lint() hygiene)
      (span as { free?: () => void }).free?.();
      suggestions.forEach((s) => (s as { free?: () => void }).free?.());
      (lint as { free?: () => void }).free?.();
    }
  }
  return out;
}

// The offscreen document cannot read chrome.storage, so the service worker supplies the
// resolved AIConfig with the request.
async function runAI(request: AIRequest, config: AIConfig, streamId: string): Promise<AIResponse> {
  // 0) Translation prefers Chrome's purpose-built on-device Translator API (free, local).
  if (request.capability === 'translate') {
    const translated = await tryChromeTranslate(request);
    if (translated !== null) return { ok: true, text: translated };
  }
  // 1) Opportunistic free on-device tier (Chrome built-in Prompt API), if available.
  const builtin = await tryChromeAI(request);
  if (builtin !== null) return { ok: true, text: builtin };
  // 2) Fall back to BYOK — stream the OpenAI-compatible SSE response.
  if (!hasKey(config)) return { ok: false, error: 'no-api-key' };
  try {
    const messages = buildMessages(request);
    const req = buildHttpRequest(config, messages, true); // stream
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!res.ok || !res.body) return { ok: false, error: `http ${res.status}` };
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const { events, rest } = splitSSE(buffer);
      buffer = rest;
      for (const ev of events) {
        const delta = deltaFromEvent(ev);
        if (delta) {
          full += delta;
          browser.runtime.sendMessage({ type: 'inkly:ai:chunk', streamId, delta }).catch(() => {});
        }
      }
    }
    return { ok: true, text: full.trim() };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}

browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse: (r: LintResponse | AIResponse) => void): true | undefined => {
  const m = msg as Partial<OffscreenLintRequest> & { type?: string };
  if (m?.target !== 'offscreen') return undefined; // not ours
  if (m.type === 'harper:lint') {
    lint((m as Partial<OffscreenLintRequest>).text ?? '')
      .then((lints) => sendResponse({ ok: true, lints }))
      .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
    return true;
  }
  if (m.type === 'ai:run') {
    const { request, config, streamId } = m as unknown as { request: AIRequest; config: AIConfig; streamId?: string };
    runAI(request, config, streamId ?? '')
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
    return true;
  }
  return undefined;
});

// Warm the engine as soon as the offscreen doc loads (amortize the 17 MB compile).
ensureLinter();
(setupPromise as Promise<void> | null)?.catch(() => { /* surfaced later on the first lint() */ });
