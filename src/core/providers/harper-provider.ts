import { Provider, ProviderContext, Suggestion, makeSuggestion } from '../types';
import type { PlainLint } from '../../entrypoints/harper-worker';

/**
 * HarperProvider (M2a spike — Approach 2).
 *
 * Runs Harper's LocalLinter inside a dedicated worker so linting never blocks
 * the page's main thread.
 *
 * Why not WorkerLinter directly here? A content script runs in the PAGE's
 * origin, and Chromium forbids constructing a Worker from a cross-origin
 * chrome-extension:// URL (SecurityError) — which is how WorkerLinter (and a
 * plain `new Worker(getURL(...))`) would load its bundle. The workaround is to
 * fetch our web-accessible worker bundle and spawn it from a SAME-origin blob
 * URL (see spawn()). NOTE: this is a content-script constraint, NOT a CSP one —
 * WorkerLinter works fine when used from an extension page (popup/offscreen).
 *
 * The content script (this class) has the chrome/browser API and computes the
 * web-accessible WASM URL, then posts it into the worker. The worker maps
 * wasm-backed Lint objects to plain PlainLint before posting back.
 */

type OutMsg =
  | { type: 'ready'; id: number }
  | { type: 'lints'; id: number; lints: PlainLint[] }
  | { type: 'error'; id: number; error: string };

export class HarperProvider implements Provider {
  readonly source = 'harper' as const;

  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (l: PlainLint[]) => void; reject: (e: Error) => void }>();
  private ready: Promise<void>;

  /**
   * @param workerUrl  extension-origin URL of the bundled worker
   *                   (browser.runtime.getURL('/harper-worker.js'))
   * @param wasmUrl    extension-origin URL of the WASM binary
   *                   (browser.runtime.getURL('wasm/harper_wasm_bg.wasm'))
   *
   * A content script runs in the PAGE's origin, so it cannot construct a Worker
   * directly from a chrome-extension:// URL (Chromium throws a cross-origin
   * SecurityError). We therefore fetch the (web-accessible) worker script and
   * spawn it from a same-origin blob URL. The worker is a self-contained IIFE.
   */
  constructor(workerUrl: string, wasmUrl: string) {
    this.ready = this.spawn(workerUrl, wasmUrl);
  }

  private async spawn(workerUrl: string, wasmUrl: string): Promise<void> {
    const src = await (await fetch(workerUrl)).text();
    const blobUrl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    this.worker = new Worker(blobUrl);
    URL.revokeObjectURL(blobUrl);
    this.worker.onmessage = (e: MessageEvent<OutMsg>) => this.onMessage(e.data);

    const id = ++this.seq;
    const ready = new Promise<void>((resolve, reject) => {
      this.pending.set(id, { resolve: () => resolve(), reject });
    });
    this.worker.postMessage({ type: 'init', id, wasmUrl });
    return ready;
  }

  private onMessage(msg: OutMsg): void {
    const p = this.pending.get(msg.id);
    if (!p) return;
    this.pending.delete(msg.id);
    if (msg.type === 'error') p.reject(new Error(msg.error));
    else if (msg.type === 'ready') p.resolve([]);
    else if (msg.type === 'lints') p.resolve(msg.lints);
  }

  async check(text: string, _ctx: ProviderContext): Promise<Suggestion[]> {
    await this.ready;
    const id = ++this.seq;
    const lints = await new Promise<PlainLint[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type: 'lint', id, text });
    });
    return lints.map(plainLintToSuggestion);
  }
}

/**
 * Map a Harper PlainLint to our Suggestion.
 * - span {start,end} (char indices) -> offset = start, length = end - start
 * - replacements: Harper Remove suggestions yield '' (replace-with-nothing),
 *   which our apply-engine already treats as "remove". We keep all of them.
 * - category = lint.lint_kind() (e.g. "Typo", "Agreement"); severityFor() maps it.
 */
export function plainLintToSuggestion(lint: PlainLint): Suggestion {
  return makeSuggestion({
    offset: lint.start,
    length: Math.max(0, lint.end - lint.start),
    replacements: lint.replacements,
    message: lint.message,
    ruleId: lint.kind,
    category: lint.kind,
    source: 'harper',
  });
}
