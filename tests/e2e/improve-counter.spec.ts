import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
  });
}

// Regression: applying an improvement that fixes the only error must re-lint and clear the
// grammar count. This used to fail in textarea/input — applyRange doesn't refocus the field,
// so the panel unmounting fired a focusout that cancelled the pending recheck.
for (const f of [
  { page: 'contenteditable.html', sel: '#editor' },
  { page: 'textarea.html', sel: '#ta' },
]) {
  test(`grammar count updates after applying an improvement — ${f.page}`, async ({ context }) => {
    await setAIConfig(context);
    const page = await context.newPage();
    await page.goto('/' + f.page);
    const editor = page.locator(f.sel);
    await editor.click();
    await editor.type('teh world');

    const grammar = page.locator('css=.inkly-fb__badge');
    await expect(grammar).toHaveText('1', { timeout: 30_000 });

    await page.locator('css=.inkly-fb__btn').click();
    await page.locator('css=.inkly-fb__item[data-act="improve"]').click();
    const apply = page.locator('css=.inkly-ai__imp .inkly-ai__chip');
    await expect(apply.first()).toBeVisible({ timeout: 10_000 });
    await apply.first().click(); // mock corrects "teh" → "the", clearing the only error

    // The count badge must disappear once the recheck runs over the corrected text.
    await expect(grammar).toHaveCount(0, { timeout: 10_000 });
  });
}
