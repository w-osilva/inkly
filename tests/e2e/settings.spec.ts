import { test, expect } from './_extension';

// `chrome` exists in the service-worker context where sw.evaluate() runs.
declare const chrome: { storage: { sync: { set(items: Record<string, unknown>): Promise<void> } } };

// Write inkly settings by evaluating in the extension's service worker.
async function writeSettings(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => {
    await chrome.storage.sync.set({ 'inkly:settings': v });
  }, value);
}

test('disabling the current site suppresses underlines; enabling restores them', async ({ context }) => {
  // Disable inkly for the fixture host BEFORE loading the page (avoids the
  // initial enabled=true window).
  await writeSettings(context, { globalEnabled: true, siteOverrides: { 'localhost:5193': false } });

  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I has a apple');

  await page.waitForTimeout(3_000);
  await expect(page.locator('css=div.inkly-underline')).toHaveCount(0);

  // Re-enable for this host; content reacts to storage.onChanged.
  await writeSettings(context, { globalEnabled: true, siteOverrides: {} });
  await editor.type(' more'); // trigger a fresh check
  await expect(page.locator('css=div.inkly-underline').first()).toBeVisible({ timeout: 30_000 });
});
