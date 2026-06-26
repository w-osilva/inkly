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
  }).then(() => { creating = null; });
  await creating;
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: unknown): Promise<LintResponse> | undefined => {
    const m = msg as Partial<LintRequest> & { target?: string };
    if (m?.target === 'offscreen') return undefined;        // destined for the offscreen doc, not us
    if (m?.type !== 'inkly:harper:lint') return undefined;  // unrelated message
    return ensureOffscreen()
      .then(() => browser.runtime.sendMessage({ target: 'offscreen', type: 'harper:lint', text: m.text ?? '' }))
      .then((res) => (res ?? { ok: false, error: 'no offscreen response' }) as LintResponse)
      .catch((err) => ({ ok: false, error: String((err as Error)?.stack ?? err) }) as LintResponse);
  });
});
