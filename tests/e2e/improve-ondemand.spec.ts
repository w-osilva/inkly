import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(i: Record<string, unknown>): Promise<void> }; sync: { set(i: Record<string, unknown>): Promise<void> } } };

async function configure(context: import('@playwright/test').BrowserContext) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'inkly:ai': { provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'k', model: 'm' } });
    // autoAiCheck omitted → defaults OFF: the AI must NOT run on its own.
    await chrome.storage.sync.set({ 'inkly:settings': { globalEnabled: true, siteOverrides: {}, disabledCategories: [], dictionary: [], uiLanguage: 'auto', defaultTone: '', theme: 'auto', correctionDisabled: ['languagetool'] } });
  });
}

// Auto AI is opt-in (off by default): nothing AI happens until the user clicks ✨ Improve in
// the field widget, which analyses the sentence on demand.
test('on-demand Improve runs the AI and surfaces the correction', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I was have been here'); // only the AI can catch this

  // No automatic AI suggestion while autoAiCheck is off.
  const widget = page.locator('css=.inkly-fb__main');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  await expect(page.locator('css=div.inkly-underline[data-severity="suggestion"]')).toHaveCount(0);

  // Reveal the pill, click ✨ Improve → the AI runs and the review shows the fix.
  await widget.focus();
  await page.locator('css=.inkly-fb__seg[data-act="improve"]').click();
  const rv = page.locator('css=.inkly-rv');
  await expect(rv).toBeVisible({ timeout: 15_000 });
  await page.locator('css=.inkly-rv__accept, .inkly-rv__choice').first().click();
  await expect(editor).toContainText('I was here');
});

// A single logical change ("bought" → "will buy") must surface as ONE suggestion that applies
// to the whole correct sentence — not two incoherent independent edits.
test('a word→two-words correction is one coherent suggestion', async ({ context }) => {
  await configure(context);
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I bought an apple tomorrow');

  const widget = page.locator('css=.inkly-fb__main');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  await widget.focus();
  await page.locator('css=.inkly-fb__seg[data-act="improve"]').click();

  const rv = page.locator('css=.inkly-rv');
  await expect(rv).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('css=.inkly-rv__count')).toHaveText('1'); // ONE suggestion, not two
  await page.locator('css=.inkly-rv__accept, .inkly-rv__choice').first().click();
  await expect(editor).toContainText('I will buy an apple tomorrow');
});
