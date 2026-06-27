import { test, expect } from './_extension';

declare const chrome: {
  storage: { local: { set(i: Record<string, unknown>): Promise<void> } };
  tabs: { query(q: object): Promise<Array<{ id?: number }>>; sendMessage(id: number, m: unknown): unknown };
};

async function setup(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
  });
  return sw;
}

async function selectWorld(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const el = document.querySelector('#editor') as HTMLElement; el.focus();
    const node = el.firstChild!;
    const r = document.createRange(); r.setStart(node, 6); r.setEnd(node, 11);
    const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

async function sendTrigger(sw: import('@playwright/test').Worker, capability: string) {
  await sw.evaluate(async (cap) => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]?.id) chrome.tabs.sendMessage(tabs[0].id, { type: 'inkly:trigger', capability: cap });
  }, capability);
}

test('a Rewrite trigger runs the AI panel on the current selection', async ({ context }) => {
  const sw = await setup(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await sendTrigger(sw, 'rewrite');
  await expect(page.locator('css=.inkly-ai__result')).toHaveText('REWRITTEN: hello world', { timeout: 10_000 });
});

test('an "open" trigger shows the action menu', async ({ context }) => {
  const sw = await setup(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await sendTrigger(sw, 'open');
  await expect(page.locator('css=.inkly-ai__btn').filter({ hasText: 'Rewrite' })).toBeVisible({ timeout: 5_000 });
});
