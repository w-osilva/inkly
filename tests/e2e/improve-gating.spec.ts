import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    // Disable LanguageTool so grammar comes from Harper only; keep AI auto-improve on.
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', correctionDisabled: ['languagetool'] } });
  });
}

// The automatic improvement pass holds until the review (grammar) is clear, so the two
// layers don't double-notify the same text. The ✨ button can still fetch on demand.
test('auto-improve waits until grammar errors are resolved', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh please proof this draft'); // "teh" = grammar error; "proof" = improvable

  // Grammar underline shows; the AI suggestion tier is withheld while an error remains.
  const correctness = page.locator('css=div.inkly-underline[data-severity="correctness"]').first();
  await expect(correctness).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500); // past the 1.5s auto-improve debounce
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);

  // Fix the grammar error via its card; once the field is clean, improvements surface.
  const box = await correctness.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);
  await page.locator('css=.inkly-card__rep').first().click();

  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]').first()).toBeVisible({ timeout: 15_000 });
});
