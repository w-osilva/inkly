import type { LintRequest, LintResponse } from '../core/providers/harper-messages';
import { getAIConfig } from '../core/ai/ai-config';

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
  const streamTabs = new Map<string, number>();

  const AI_MENU = [
    { id: 'inkly-rewrite', title: 'Rewrite' },
    { id: 'inkly-translate', title: 'Translate' },
    { id: 'inkly-synonyms', title: 'Synonyms' },
    { id: 'inkly-improve', title: 'Improve' },
  ];

  function registerMenus() {
    browser.contextMenus.removeAll().then(() => {
      browser.contextMenus.create({ id: 'inkly', title: 'inkly', contexts: ['editable', 'selection'] });
      for (const m of AI_MENU) {
        browser.contextMenus.create({ id: m.id, parentId: 'inkly', title: m.title, contexts: ['editable', 'selection'] });
      }
    });
  }
  browser.runtime.onInstalled.addListener(registerMenus);
  browser.runtime.onStartup.addListener(registerMenus);

  browser.contextMenus.onClicked.addListener((info, tab) => {
    const cap = String(info.menuItemId).replace('inkly-', '');
    if (!tab?.id || !['rewrite', 'translate', 'synonyms', 'improve'].includes(cap)) return;
    void browser.tabs.sendMessage(tab.id, { type: 'inkly:trigger', capability: cap }).catch(() => {});
  });

  browser.commands.onCommand.addListener((command) => {
    if (command !== 'inkly-open-ai') return;
    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const id = tabs[0]?.id;
      if (id) void browser.tabs.sendMessage(id, { type: 'inkly:trigger', capability: 'open' }).catch(() => {});
    });
  });

  browser.runtime.onMessage.addListener((msg: unknown, sender, sendResponse: (r: unknown) => void): true | undefined => {
    const m = msg as Partial<LintRequest> & { target?: string; type?: string };
    if (m?.target === 'offscreen') return undefined;        // destined for the offscreen doc, not us
    if ((m as { type?: string })?.type === 'inkly:warm') {
      // Pre-warm: create the offscreen doc so Harper's WASM starts compiling while the
      // user is still typing, instead of stalling the first lint (cold start ~seconds).
      void ensureOffscreen().catch(() => {});
      return undefined;
    }
    if ((m as { type?: string })?.type === 'inkly:ai:chunk') {
      const { streamId, delta } = msg as { streamId: string; delta: string };
      const tabId = streamTabs.get(streamId);
      if (tabId != null) {
        void browser.tabs.sendMessage(tabId, { type: 'inkly:ai:chunk', streamId, delta }).catch(() => {});
      }
      return undefined; // fire-and-forget, no response expected
    }
    if (m?.type === 'inkly:harper:lint') {
      ensureOffscreen()
        .then(() => browser.runtime.sendMessage({ target: 'offscreen', type: 'harper:lint', text: (m as Partial<LintRequest>).text ?? '' }))
        .then((res) => sendResponse((res ?? { ok: false, error: 'no offscreen response' }) as LintResponse))
        .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }));
      return true;
    }
    if (m?.type === 'inkly:ai:run') {
      // Offscreen documents have no chrome.storage access, so the service worker reads
      // the AIConfig here and passes it into the offscreen with the request.
      const streamId = (msg as { streamId?: string }).streamId ?? '';
      const tabId = sender.tab?.id;
      if (streamId && tabId != null) streamTabs.set(streamId, tabId);
      Promise.all([ensureOffscreen(), getAIConfig()])
        .then(([, config]) => browser.runtime.sendMessage({ target: 'offscreen', type: 'ai:run', request: (m as { request: unknown }).request, config, streamId }))
        .then((res) => sendResponse((res ?? { ok: false, error: 'no offscreen response' })))
        .catch((err) => sendResponse({ ok: false, error: String((err as Error)?.stack ?? err) }))
        .finally(() => { if (streamId) streamTabs.delete(streamId); });
      return true;
    }
    return undefined;
  });
});
