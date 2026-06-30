import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', correctionDisabled: ['languagetool'], autoAiCheck: true } });
  });
}

// Safety: a weak model "correcting" a fine sentence by dropping a proper noun (the mock drops
// "Greece") must be rejected — no destructive suggestion is ever shown.
test('rejects an AI edit that would delete a proper noun', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I had been in Santos before I went to Greece');

  await page.waitForTimeout(3500); // let the AI verify pass run + diff
  // The bad deletion is filtered out — nothing to suggest, text is preserved.
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);
  await expect(editor).toContainText('went to Greece');
});
