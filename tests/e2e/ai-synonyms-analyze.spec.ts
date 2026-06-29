import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
  });
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

test('Synonyms shows alternatives; picking one replaces the selection', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Synonyms' }).click();
  const beta = page.locator('css=.inkly-ai__chip').filter({ hasText: 'beta' });
  await expect(beta).toBeVisible({ timeout: 10_000 });
  await beta.click();
  await expect(editor).toContainText('hello beta');
});

test('Improve lists applicable edits; Apply replaces the text', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Improve' }).click();
  const applyChip = page.locator('css=.inkly-ai__imp .inkly-ai__chip');
  await expect(applyChip.first()).toBeVisible({ timeout: 10_000 });
  await applyChip.first().click();
  await expect(editor).toContainText('IMPROVED: hello world');
});

test('Define shows the word meaning (read-only, no Apply)', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click(); await editor.type('hello world');
  await selectWorld(page);
  await page.locator('css=.inkly-ai__tab').filter({ hasText: 'Dictionary' }).click();
  await expect(page.locator('css=.inkly-ai__result')).toContainText('DEFINITION:', { timeout: 10_000 });
  await expect(page.locator('css=.inkly-ai__btn').filter({ hasText: 'Apply' })).toHaveCount(0);
});
