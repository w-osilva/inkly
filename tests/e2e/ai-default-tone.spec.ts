import { test, expect } from './_extension';

declare const chrome: {
  storage: {
    local: { set(i: Record<string, unknown>): Promise<void> };
    sync: { set(i: Record<string, unknown>): Promise<void> };
  };
};

async function configure(context: import('@playwright/test').BrowserContext, defaultTone: string) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (tone) => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'en', defaultTone: tone } });
  }, defaultTone);
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

test('a configured defaultTone is applied to the first rewrite (no chip click)', async ({ context }) => {
  await configure(context, 'formal');
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Rewrite' }).click();
  await expect(page.locator('css=.inkly-ai__result')).toHaveText('REWRITTEN[formal]: hello world', { timeout: 10_000 });
});

test('no defaultTone → neutral rewrite (no tone tag)', async ({ context }) => {
  await configure(context, '');
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Rewrite' }).click();
  await expect(page.locator('css=.inkly-ai__result')).toHaveText('REWRITTEN: hello world', { timeout: 10_000 });
});
