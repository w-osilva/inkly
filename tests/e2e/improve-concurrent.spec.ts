import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', correctionDisabled: ['languagetool'] } });
  });
}

// Review and AI improvements run concurrently (no sequential wait): the AI is told which
// spans are already flagged so it doesn't repeat them, and any overlap is dropped. So a
// grammar error and a distinct AI suggestion can coexist on the same field.
test('grammar review and AI improvement surface together without duplicating', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh please proof this draft'); // "teh" = grammar; "proof" → "try" (AI)

  // Both tiers appear at once — no need to clear grammar first.
  await expect(page.locator('css=div.inkly-underline[data-severity="correctness"]').first()).toBeVisible({ timeout: 30_000 });
  const suggestion = page.locator('css=div.inkly-underline[data-severity="suggestion"]').first();
  await expect(suggestion).toBeVisible({ timeout: 15_000 });

  // The AI suggestion is the distinct one ("proof" → "try"), not a repeat of the grammar error.
  const box = await suggestion.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);
  await expect(page.locator('css=.inkly-card__rep', { hasText: 'try' })).toBeVisible({ timeout: 5_000 });
});
