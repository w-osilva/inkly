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

// The AI's holistic correction supersedes the rules' atomic fix: "waz" alone would become
// "I was have been …" (still broken). The correct→diff pass widens the fix so ONE click goes
// straight to the correct sentence — no broken intermediate.
test('AI holistic correction wins over the atomic rule fix in one step', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I waz have been here'); // Harper flags "waz"; AI corrects "waz have been" → "was"

  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(3500); // let the AI verify pass (2s debounce) supersede the rule fix

  const card = page.locator('css=.inkly-card');
  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no underline box');
    await page.mouse.click(box.x + box.width / 2, box.y - 4);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 15_000 });
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();

  // One application lands on the fully-correct sentence, not the half-fixed "I was have been".
  await expect.poll(async () => (await editor.innerText()).trim()).toBe('I was here');
});
