import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
  });
}

test('the widget menu runs improvements and applies one', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('hello world');

  // Focus the widget to reveal its action pill, then the Improve icon.
  const widget = page.locator('css=.inkly-fb__main');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  await widget.focus();
  await page.locator('css=.inkly-fb__seg[data-act="improve"]').click();

  // On-demand improve lists applicable edits; Apply replaces the text.
  const apply = page.locator('css=.inkly-ai__imp .inkly-ai__chip');
  await expect(apply.first()).toBeVisible({ timeout: 10_000 });
  await apply.first().click();
  await expect(editor).toContainText('IMPROVED: hello world');
});

test('applying one improvement keeps the others in the panel', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('i wanna proof a pizza'); // mock returns two edits

  await page.locator('css=.inkly-fb__main').focus();
  await page.locator('css=.inkly-fb__seg[data-act="improve"]').click();
  const items = page.locator('css=.inkly-ai__imp');
  await expect(items).toHaveCount(2, { timeout: 10_000 });
  await page.locator('css=.inkly-ai__imp .inkly-ai__chip').first().click(); // apply one
  // The other improvement must still be listed (not wiped by the applied edit).
  await expect(items).toHaveCount(1);
});
