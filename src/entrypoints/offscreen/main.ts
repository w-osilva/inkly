import { LocalLinter, Dialect, createBinaryModuleFromUrl, type Linter } from 'harper.js';
import type { PlainLint, OffscreenLintRequest, LintResponse } from '../../core/providers/harper-messages';

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
  // 'plaintext' — editable fields are plain text, not markdown (Harper's default).
  const lints = await l.lint(text, { language: 'plaintext' });
  try {
    return lints.map((lint) => {
      const span = lint.span();
      const suggestions = lint.suggestions();
      const plain: PlainLint = {
        start: span.start,
        end: span.end,
        replacements: suggestions.map((s) => s.get_replacement_text()),
        message: lint.message(),
        kind: lint.lint_kind(),
      };
      // Harper's Lint/Span/Suggestion are wasm-backed and caller-owned: free
      // them so the always-on shared engine doesn't leak on every keystroke.
      (span as { free?: () => void }).free?.();
      suggestions.forEach((s) => (s as { free?: () => void }).free?.());
      return plain;
    });
  } finally {
    lints.forEach((lint) => (lint as { free?: () => void }).free?.());
  }
}

browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse: (r: LintResponse) => void): true | undefined => {
  const m = msg as Partial<OffscreenLintRequest>;
  if (m?.target !== 'offscreen' || m.type !== 'harper:lint') return undefined; // not ours
  lint(m.text ?? '')
    .then((lints) => sendResponse({ ok: true, lints }))
    .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
  return true; // async sendResponse
});

// Warm the engine as soon as the offscreen doc loads (amortize the 17 MB compile).
ensureLinter();
(setupPromise as Promise<void> | null)?.catch(() => { /* surfaced later on the first lint() */ });
