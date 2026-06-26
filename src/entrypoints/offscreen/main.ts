import { LocalLinter, Dialect, createBinaryModuleFromUrl, type Linter } from 'harper.js';
import type { PlainLint, OffscreenLintRequest, LintResponse } from '../../core/providers/harper-messages';
import { hasKey } from '../../core/ai/ai-config';
import { buildMessages } from '../../core/ai/prompts';
import { buildHttpRequest, parseChatCompletion } from '../../core/ai/openai-provider';
import type { AIConfig, AIRequest, AIResponse } from '../../core/ai/ai-types';
import { tryChromeAI } from '../../core/ai/chrome-ai';

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
async function runAI(request: AIRequest, config: AIConfig): Promise<AIResponse> {
  // 1) Opportunistic free on-device tier (Chrome built-in Prompt API), if available.
  const builtin = await tryChromeAI(request);
  if (builtin !== null) return { ok: true, text: builtin };
  // 2) Fall back to BYOK.
  if (!hasKey(config)) return { ok: false, error: 'no-api-key' };
  try {
    const messages = buildMessages(request);
    const req = buildHttpRequest(config, messages);
    const res = await fetch(req.url, { method: 'POST', headers: req.headers, body: req.body });
    if (!res.ok) return { ok: false, error: `http ${res.status}` };
    const text = parseChatCompletion(await res.json());
    return { ok: true, text };
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
    const { request, config } = m as unknown as { request: AIRequest; config: AIConfig };
    runAI(request, config)
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
    return true;
  }
  return undefined;
});

// Warm the engine as soon as the offscreen doc loads (amortize the 17 MB compile).
ensureLinter();
(setupPromise as Promise<void> | null)?.catch(() => { /* surfaced later on the first lint() */ });
