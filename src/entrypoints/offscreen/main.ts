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
  return lints.map((lint) => {
    const span = lint.span();
    return {
      start: span.start,
      end: span.end,
      replacements: lint.suggestions().map((s) => s.get_replacement_text()),
      message: lint.message(),
      kind: lint.lint_kind(),
    };
  });
}

browser.runtime.onMessage.addListener((msg: unknown): Promise<LintResponse> | undefined => {
  const m = msg as Partial<OffscreenLintRequest>;
  if (m?.target !== 'offscreen' || m.type !== 'harper:lint') return undefined; // not ours
  return lint(m.text ?? '')
    .then((lints) => ({ ok: true, lints }) as LintResponse)
    .catch((err) => ({ ok: false, error: String(err?.stack ?? err) }) as LintResponse);
});

// Warm the engine as soon as the offscreen doc loads (amortize the 17 MB compile).
ensureLinter();
