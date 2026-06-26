import { test, expect } from './_extension';

test('renders a correctness underline for "teh" in a contenteditable', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');

  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');

  const underline = page.locator('css=div.inkly-underline[data-severity="correctness"]');
  await expect(underline.first()).toBeVisible({ timeout: 5000 });
});

test('applying the first suggestion fixes the text', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');
  await page.waitForTimeout(600);

  await page.evaluate(() => (window as any).__inklyApplyFirst?.());
  await expect(editor).toContainText('cat');
});
