import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
  });
}

test('the corner ✨ button runs improvements and applies one', async ({ context }) => {
  await setAIConfig(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('hello world');

  // The separate improvements button (distinct from the grammar drop).
  const improveBtn = page.locator('css=.inkly-fb__btn--improve');
  await expect(improveBtn).toBeVisible({ timeout: 30_000 });
  await improveBtn.click();

  // On-demand improve lists applicable edits; Apply replaces the text.
  const apply = page.locator('css=.inkly-ai__imp .inkly-ai__chip');
  await expect(apply.first()).toBeVisible({ timeout: 10_000 });
  await apply.first().click();
  await expect(editor).toContainText('IMPROVED: hello world');
});
