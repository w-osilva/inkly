import { test, expect } from './_extension';

declare const chrome: { storage: { sync: { set(i: Record<string, unknown>): Promise<void>; get(k: string): Promise<Record<string, unknown>> } } };

const SETTINGS = (over: Record<string, unknown>) => ({
  globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto',
  defaultTone: '', theme: 'auto', correctionDisabled: [], selectionActionsDisabled: [],
  languageToolEndpoint: 'http://localhost:5199/v2',
  correctionOrder: ['harper', 'punctuation', 'languagetool', 'proofreader', 'aiImprove'],
  ...over,
});

async function seed(context: import('@playwright/test').BrowserContext, over: Record<string, unknown>) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (s) => { await chrome.storage.sync.set({ 'inkly:settings': s }); }, SETTINGS(over));
  return sw;
}

async function cardReplacementForTeh(context: import('@playwright/test').BrowserContext): Promise<string> {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 15_000 });
  const box = await underline.boundingBox();
  await page.mouse.click(box!.x + box!.width / 2, box!.y - 5);
  const rep = page.locator('css=.inkly-card__rep').first();
  await expect(rep).toBeVisible({ timeout: 5_000 });
  return (await rep.textContent())!.trim();
}

// Harper and LanguageTool both flag "teh"; the priority order decides which replacement wins.
test('default priority: Harper wins the overlap (the)', async ({ context }) => {
  await seed(context, {});
  expect(await cardReplacementForTeh(context)).toBe('the');
});

test('reordered priority: LanguageTool wins the overlap (THE)', async ({ context }) => {
  await seed(context, { correctionOrder: ['languagetool', 'harper', 'punctuation', 'proofreader', 'aiImprove'] });
  expect(await cardReplacementForTeh(context)).toBe('THE');
});

// The options reorder buttons rewrite correctionOrder in storage.
test('options ▲ moves a tool up in correctionOrder', async ({ context }) => {
  const sw = await seed(context, {});
  const extId = new URL(sw.url()).host;
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/options.html`);

  const row = page.locator('css=li.tool', { hasText: 'LanguageTool' });
  await row.locator('css=.tool-move').first().click(); // ▲ once: swaps above punctuation
  await expect(async () => {
    const stored = await sw.evaluate(async () => (await chrome.storage.sync.get('inkly:settings'))['inkly:settings']);
    const order = (stored as { correctionOrder: string[] }).correctionOrder;
    expect(order.indexOf('languagetool')).toBeLessThan(order.indexOf('punctuation'));
  }).toPass({ timeout: 5_000 });
});

// A disabled selection action doesn't appear in the toolbar.
test('disabled action is hidden from the selection toolbar', async ({ context }) => {
  await seed(context, { selectionActionsDisabled: ['define'] });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('pizza');
  // Select the word to raise the actions toolbar.
  await page.keyboard.press('Control+A');
  const tabs = page.locator('css=.inkly-ai__tab');
  await expect(tabs.first()).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('css=.inkly-ai__tab', { hasText: 'Define' })).toHaveCount(0);
  await expect(page.locator('css=.inkly-ai__tab', { hasText: 'Synonyms' })).toHaveCount(1);
});
