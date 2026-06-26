/**
 * Dedicated worker that runs Harper's LocalLinter off the page's main thread
 * (Approach 2 of the M2a spike). Defined as a WXT "unlisted script" so it is
 * emitted at a STABLE, predictable path (`/harper-worker.js`) that the content
 * script can load from the EXTENSION origin via browser.runtime.getURL() and
 * that we list in web_accessible_resources. (Vite's `new Worker(new URL(...))`
 * resolution is broken in content scripts — it resolves against the page origin,
 * yielding a 404. See the spike report.)
 *
 * Workers have no chrome/browser API, so the content script computes the
 * web-accessible WASM URL and posts it in via the `init` message; we load it
 * with createBinaryModuleFromUrl.
 *
 * Harper's Lint objects are wasm-backed and NOT structured-cloneable, so we map
 * them to plain { start, end, replacements, message, kind } objects HERE, inside
 * the worker, before posting back across the boundary.
 */
import {
  LocalLinter,
  Dialect,
  createBinaryModuleFromUrl,
  type Linter,
} from 'harper.js';

export interface PlainLint {
  start: number; // character index (inclusive)
  end: number; // character index (exclusive)
  replacements: string[]; // each suggestion's replacement text ('' == Remove)
  message: string;
  kind: string; // lint.lint_kind() e.g. "Typo", "Agreement"
}

type InitMsg = { type: 'init'; id: number; wasmUrl: string };
type LintMsg = { type: 'lint'; id: number; text: string };
type InMsg = InitMsg | LintMsg;

export default defineUnlistedScript(() => {
  let linter: Linter | null = null;
  let setupPromise: Promise<void> | null = null;

  function getLinter(wasmUrl: string): Linter {
    if (!linter) {
      const binary = createBinaryModuleFromUrl(wasmUrl);
      linter = new LocalLinter({ binary, dialect: Dialect.American });
      setupPromise = linter.setup();
    }
    return linter;
  }

  self.onmessage = async (e: MessageEvent<InMsg>) => {
    const msg = e.data;
    try {
      if (msg.type === 'init') {
        getLinter(msg.wasmUrl);
        await setupPromise;
        self.postMessage({ type: 'ready', id: msg.id });
        return;
      }
      if (msg.type === 'lint') {
        if (!linter) throw new Error('harper worker: lint before init');
        await setupPromise;
        // language: 'plaintext' — editable fields are plain text, not markdown.
        const lints = await linter.lint(msg.text, { language: 'plaintext' });
        const plain: PlainLint[] = lints.map((lint) => {
          const span = lint.span();
          const replacements = lint.suggestions().map((s) => s.get_replacement_text());
          return {
            start: span.start,
            end: span.end,
            replacements,
            message: lint.message(),
            kind: lint.lint_kind(),
          };
        });
        self.postMessage({ type: 'lints', id: msg.id, lints: plain });
        return;
      }
    } catch (err) {
      self.postMessage({
        type: 'error',
        id: msg.id,
        error: String(err instanceof Error ? (err.stack ?? err.message) : err),
      });
    }
  };
});
