import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(items: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => { await chrome.storage.local.set({ 'inkly:ai': v }); }, value);
}

async function selectWorld(page: import('@playwright/test').Page) {
  // Select the word "world" (chars 6..11) in #editor and fire selectionchange.
  await page.evaluate(() => {
    const el = document.querySelector('#editor') as HTMLElement;
    el.focus();
    const node = el.firstChild!;
    const r = document.createRange();
    r.setStart(node, 6);
    r.setEnd(node, 11);
    const s = window.getSelection()!;
    s.removeAllRanges();
    s.addRange(r);
    document.dispatchEvent(new Event('selectionchange'));
  });
}

test('select → Rewrite → result → Apply replaces the selection', async ({ context }) => {
  await setAIConfig(context, {
    provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm',
  });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('hello world');

  await selectWorld(page);

  const rewriteBtn = page.locator('css=.inkly-ai__btn').filter({ hasText: 'Rewrite' });
  await expect(rewriteBtn).toBeVisible({ timeout: 5_000 });
  await rewriteBtn.click();

  await expect(page.locator('css=.inkly-ai__result')).toContainText('REWRITTEN: world', { timeout: 10_000 });
  await page.locator('css=.inkly-ai__btn').filter({ hasText: 'Apply' }).click();
  await expect(editor).toContainText('hello REWRITTEN: world');
});

test('rewrite without a key shows the error phase', async ({ context }) => {
  await setAIConfig(context, { provider: 'openai-compatible', endpoint: '', apiKey: '', model: '' });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('hello world');
  await selectWorld(page);
  const rewriteBtn = page.locator('css=.inkly-ai__btn').filter({ hasText: 'Rewrite' });
  await expect(rewriteBtn).toBeVisible({ timeout: 5_000 });
  await rewriteBtn.click();
  await expect(page.locator('css=.inkly-ai__error')).toContainText('no-api-key', { timeout: 10_000 });
});
