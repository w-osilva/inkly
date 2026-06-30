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

// When the AI refines an error a rule already caught, it must keep that rule's severity (and
// category) — not flatten everything to a generic, softer suggestion after the AI pass runs.
test('AI supersede keeps the rule severity (correctness stays correctness)', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh world'); // Harper flags "teh" as a correctness error

  // Correctness underline from the rule.
  await expect(page.locator('css=div.inkly-underline[data-severity="correctness"]').first()).toBeVisible({ timeout: 30_000 });
  // After the AI verify pass supersedes it (~2s), it must STILL be correctness, never demoted.
  await page.waitForTimeout(3500);
  await expect(page.locator('css=div.inkly-underline[data-severity="correctness"]').first()).toBeVisible();
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);
});
