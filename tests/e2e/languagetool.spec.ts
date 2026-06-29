import { test, expect } from './_extension';

declare const chrome: { storage: { sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext, enabled: boolean) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (en) => {
    await chrome.storage.sync.set({ 'inkly:settings': {
      globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto',
      defaultTone: '', theme: 'auto', autoSuggest: false,
      languageToolEnabled: en, languageToolEndpoint: 'http://localhost:5199/v2',
    } });
  }, enabled);
}

// Opt-in LanguageTool: when enabled, its hits merge into the grammar underlines. The mock
// LT server flags "really" → "very" (something Harper doesn't catch in this fixture).
test('LanguageTool suggestions appear when enabled', async ({ context }) => {
  await configure(context, true);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('This really works fine');

  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 15_000 });

  const box = await underline.boundingBox();
  // Click the "really" underline to open its card; assert the LT replacement is offered.
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);
  await expect(page.locator('css=.inkly-card__rep', { hasText: 'very' })).toBeVisible({ timeout: 5_000 });
});

test('no LanguageTool suggestions when disabled', async ({ context }) => {
  await configure(context, false);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('This really works fine');

  await page.waitForTimeout(1500);
  // "really" has no underline (Harper doesn't flag it; LT is off).
  const reps = page.locator('css=.inkly-card__rep', { hasText: 'very' });
  await expect(reps).toHaveCount(0);
});
