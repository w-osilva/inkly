import { test, expect } from './_extension';

// Harper is English-only; on a non-English field it must not flag correct words. With the
// document marked non-English, the "teh" misspelling Harper would normally catch is dropped
// (LanguageTool would handle that language instead).
test('Harper suggestions are suppressed on a non-English field', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'pt-BR'));
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');

  // Give Harper time to run; its underline must NOT appear because the field is non-English.
  await page.waitForTimeout(1500);
  await expect(page.locator('css=div.inkly-underline[data-severity="correctness"]')).toHaveCount(0);
});

test('Harper still works when the field is English', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  await page.evaluate(() => document.documentElement.setAttribute('lang', 'en'));
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');
  await expect(page.locator('css=div.inkly-underline[data-severity="correctness"]').first()).toBeVisible({ timeout: 30_000 });
});
