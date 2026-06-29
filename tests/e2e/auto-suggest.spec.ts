import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext, autoSuggest = true) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (auto) => {
    // AI config lives in storage.local; settings live in storage.sync.
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', autoSuggest: auto } });
  }, autoSuggest);
}

// Core value: contextual writing suggestions surface inline (LanguageTool-style), not just
// behind a button. "proof" in "please proof this draft" → suggest "try" (Harper can't catch it).
test('auto suggestions render inline and apply from the card', async ({ context }) => {
  await configure(context, true);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('please proof this draft');

  // An inline suggestion-tier underline appears (distinct from grammar's correctness tier).
  const underline = page.locator('css=div.inkly-underline[data-severity="suggestion"]').first();
  await expect(underline).toBeVisible({ timeout: 15_000 });

  // Click the underlined word to open its card (underlines are pointer-events:none, so the
  // click lands on the field and the content hit-tester opens the card). The underline is a
  // 2px line at the word's baseline, so click a few px above it to land on the glyph.
  const box = await underline.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);

  // The card offers the contextual replacement; applying it rewrites the word.
  const rep = page.locator('css=.inkly-card__rep', { hasText: 'try' });
  await expect(rep).toBeVisible({ timeout: 5_000 });
  await rep.click();
  await expect(editor).toContainText('please try this draft');
});

test('disabling autoSuggest suppresses the inline AI underline', async ({ context }) => {
  await configure(context, false);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('please proof this draft');

  await page.waitForTimeout(2500); // longer than the auto-improve debounce (1.5s)
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);
});
