import { test, expect } from './_extension';

// The widget menu offers "Disable on this site": choosing it tears down inkly's in-page UI
// (underlines + widget) for the current host.

test('widget menu disables inkly for the site', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');

  const widget = page.locator('css=.inkly-fb__main');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('css=div.inkly-underline').first()).toBeVisible({ timeout: 5_000 });

  await widget.focus();
  await page.locator('css=.inkly-fb__seg[data-act="disable"]').click();

  // UI is torn down: the widget and underlines disappear.
  await expect(widget).toHaveCount(0, { timeout: 5_000 });
  await expect(page.locator('css=div.inkly-underline')).toHaveCount(0);
});
