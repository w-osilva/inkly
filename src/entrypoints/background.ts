import type { LintRequest, LintResponse } from '../core/providers/harper-messages';

const OFFSCREEN_URL = 'offscreen.html';

let creating: Promise<void> | null = null;

async function ensureOffscreen(): Promise<void> {
  const has = await browser.offscreen.hasDocument();
  if (has) return;
  if (creating) { await creating; return; }
  creating = browser.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ['WORKERS'],
    justification: 'Run the Harper grammar-checker (WASM) off the page, shared across tabs.',
  }).finally(() => { creating = null; });
  await creating;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse: (r: unknown) => void): true | undefined => {
    const m = msg as Partial<LintRequest> & { target?: string; type?: string };
    if (m?.target === 'offscreen') return undefined;        // destined for the offscreen doc, not us
    if (m?.type === 'inkly:harper:lint') {
      ensureOffscreen()
        .then(() => browser.runtime.sendMessage({ target: 'offscreen', type: 'harper:lint', text: (m as Partial<LintRequest>).text ?? '' }))
        .then((res) => sendResponse((res ?? { ok: false, error: 'no offscreen response' }) as LintResponse))
        .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
      return true;
    }
    if (m?.type === 'inkly:ai:run') {
      ensureOffscreen()
        .then(() => browser.runtime.sendMessage({ target: 'offscreen', type: 'ai:run', request: (m as { request: unknown }).request }))
        .then((res) => sendResponse((res ?? { ok: false, error: 'no offscreen response' })))
        .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
      return true;
    }
    return undefined;
  });
});
