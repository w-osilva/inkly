import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(items: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => { await chrome.storage.local.set({ 'inkly:ai': v }); }, value);
}

async function selectWorld(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const el = document.querySelector('#editor') as HTMLElement;
    el.focus();
    const node = el.firstChild!;
    const r = document.createRange();
    r.setStart(node, 6); r.setEnd(node, 11);
    const s = window.getSelection()!; s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

test('changing the tone regenerates the rewrite with the tone option', async ({ context }) => {
  await setAIConfig(context, { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('hello world');
  await selectWorld(page);

  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Rewrite' }).click();
  await expect(page.locator('css=.inkly-ai__result')).toHaveText('REWRITTEN: hello world', { timeout: 10_000 });

  await page.locator('css=.inkly-ai__chip').filter({ hasText: 'Formal' }).click();
  await expect(page.locator('css=.inkly-ai__result')).toHaveText('REWRITTEN[formal]: hello world', { timeout: 10_000 });
});
