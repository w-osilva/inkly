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

// Quality funnel: the AI doesn't pile uncertain edits onto a sentence that still has a hard
// (correctness) error — it defers until the rule fix is applied, then refines the clean
// sentence. Everything funnels into the single widget count.
test('AI suggestions defer in a sentence with a hard error, then surface once fixed', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh please proof this draft'); // one sentence: "teh" error + "proof" (AI → "try")

  // The hard error underlines; the AI suggestion is withheld while "teh" is unresolved.
  const correctness = page.locator('css=div.inkly-underline[data-severity="correctness"]').first();
  await expect(correctness).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500); // past the 1.5s AI debounce
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);

  // Fix the hard error via its card; the sentence is now clean, so the AI refines it.
  const card = page.locator('css=.inkly-card');
  await expect(async () => {
    const box = await correctness.boundingBox();
    if (!box) throw new Error('no underline box');
    await page.mouse.click(box.x + box.width / 2, box.y - 4);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();

  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]').first()).toBeVisible({ timeout: 15_000 });
});
