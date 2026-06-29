import { test, expect } from './_extension';

declare const chrome: { storage: { sync: { set(items: Record<string, unknown>): Promise<void> } } };

async function writeSettings(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => {
    await chrome.storage.sync.set({ 'inkly:settings': v });
  }, value);
}

/**
 * Hover the first Harper underline so the suggestion card appears.
 * The underline is a 2px strip at the BOTTOM of the text rect; the content
 * script hit-tests against the full text rect, so we nudge the mouse a few px
 * UP into the text span. mousemove is rAF-throttled, so move twice and poll.
 */
async function hoverUntilCard(page: import('@playwright/test').Page) {
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 30_000 });
  const card = page.locator('css=.inkly-card');

  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no underline bounding box');
    const x = box.x + box.width / 2;
    const y = box.y - 4;
    await page.mouse.click(x, y);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('card shows the Portuguese rule description for a misspelling (pt-br)', async ({ context }) => {
  await writeSettings(context, {
    globalEnabled: true,
    siteOverrides: {},
    disabledCategories: [],
    dictionary: [],
    uiLanguage: 'pt-br',
  });

  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I lielk cats'); // "lielk" → SpellCheck

  await hoverUntilCard(page);

  // The message area shows the translated RULE DESCRIPTION (from RULE_DESCRIPTIONS_PT),
  // not Harper's live English message.
  await expect(page.locator('css=.inkly-card__msg')).toHaveText(
    'Procura e corrige palavras escritas incorretamente.',
    { timeout: 5_000 },
  );
});
