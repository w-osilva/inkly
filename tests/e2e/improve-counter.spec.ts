import { test, expect } from './_extension';

// Regression: applying a fix must re-lint and clear the grammar count. This used to fail in
// textarea/input — applyRange doesn't refocus the field, so the card unmounting fired a
// focusout that cancelled the pending recheck, leaving the count stale.
for (const f of [
  { page: 'contenteditable.html', sel: '#editor' },
  { page: 'textarea.html', sel: '#ta' },
]) {
  test(`grammar count clears after applying a fix — ${f.page}`, async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/' + f.page);
    const editor = page.locator(f.sel);
    await editor.click();
    await editor.type('teh world');

    const grammar = page.locator('css=.inkly-fb__badge');
    await expect(grammar).toHaveText('1', { timeout: 30_000 });

    // Apply the fix from the suggestion card (click the underline, then a replacement).
    const underline = page.locator('css=div.inkly-underline').first();
    const card = page.locator('css=.inkly-card');
    await expect(async () => {
      const box = await underline.boundingBox();
      if (!box) throw new Error('no underline bounding box');
      await page.mouse.click(box.x + box.width / 2, box.y - 4);
      await expect(card).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 10_000 });
    await page.locator('css=.inkly-card .inkly-card__rep').first().click(); // "teh" → "the"

    // The count badge must disappear once the recheck runs over the corrected text.
    await expect(grammar).toHaveCount(0, { timeout: 10_000 });
  });
}
