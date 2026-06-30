import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext, autoSuggest = true) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (auto) => {
    // AI config lives in storage.local; settings in storage.sync. LanguageTool off so the
    // correction comes from the AI verify tier (correct→diff), not LT.
    const correctionDisabled = auto ? ['languagetool'] : ['languagetool', 'aiImprove'];
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', correctionDisabled, autoAiCheck: true } });
  }, autoSuggest);
}

// The AI verification tier asks for the corrected text and diffs it into a targeted fix —
// catching what the rules miss (here a doubled auxiliary "was have been" → "was") and
// surfacing it inline, applied from the card.
test('AI correction surfaces inline and applies from the card', async ({ context }) => {
  await configure(context, true);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I was have been here'); // rules don't flag this; the AI does

  const underline = page.locator('css=div.inkly-underline[data-severity="suggestion"]').first();
  await expect(underline).toBeVisible({ timeout: 15_000 });

  const box = await underline.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();
  await expect(editor).toContainText('I was here');
  await expect(editor).not.toContainText('have been');
});

test('disabling autoSuggest suppresses the AI correction', async ({ context }) => {
  await configure(context, false);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I was have been here');

  await page.waitForTimeout(3000); // longer than the 2s AI debounce
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);
});
