import { test, expect } from './_extension';

// Clicking the widget when there are no suggestions must not feel dead: it re-checks and, if
// still clean, confirms "nothing to fix" instead of silently doing nothing.
test('clicking the widget with no suggestions shows an all-clear message', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('The cat sat on the mat.'); // clean — no rule errors

  const widget = page.locator('css=.inkly-fb__main');
  await expect(widget).toBeVisible({ timeout: 30_000 });
  // No issue badge on clean text.
  await expect(page.locator('css=.inkly-fb__badge')).toHaveCount(0);

  await widget.click();
  const clear = page.locator('css=.inkly-rv__clear');
  await expect(clear).toBeVisible({ timeout: 5_000 });
  await expect(clear).toContainText('nothing to fix');
});
