import { test, expect } from './_extension';

declare const chrome: { storage: { sync: { set(items: Record<string, unknown>): Promise<void> } } };

async function writeSettings(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => { await chrome.storage.sync.set({ 'inkly:settings': v }); }, value);
}

const FULL = (over: Record<string, unknown>) => ({
  globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], ...over,
});

test('a dictionary word is not flagged', async ({ context }) => {
  await writeSettings(context, FULL({ dictionary: ['florbtastic'] }));
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('The florbtastic gizmo');
  await page.waitForTimeout(3_000);
  await expect(page.locator('css=div.inkly-underline')).toHaveCount(0);
});

test('disabling a category suppresses its suggestions live', async ({ context }) => {
  await writeSettings(context, FULL({}));
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I lielk cats'); // "lielk" should be a spelling error
  await expect(page.locator('css=div.inkly-underline').first()).toBeVisible({ timeout: 30_000 });

  await writeSettings(context, FULL({ disabledCategories: ['Spelling'] }));
  await editor.type(' too'); // trigger a re-check
  await expect.poll(async () => await page.locator('css=div.inkly-underline').count(), { timeout: 10_000 }).toBe(0);
});
