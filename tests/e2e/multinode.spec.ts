import { test, expect } from './_extension';

// Reuse the robust hover approach from card.spec.ts: nudge into the text rect + poll for the card.
async function hoverUnderline(page: import('@playwright/test').Page) {
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 30_000 });
  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no box');
    await page.mouse.move(box.x + box.width / 2, box.y - 4);
    await page.mouse.move(box.x + box.width / 2 + 1, box.y - 4);
    await expect(page.locator('css=.inkly-card')).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 15_000 });
}

test('underline renders + apply works in a multi-node contenteditable', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/multinode.html');
  const editor = page.locator('#editor');
  await editor.click(); // focus → triggers a check on the existing text

  // Harper should underline "teh" (in the second text node, global offset 10).
  await hoverUnderline(page);

  // The card offers "the" → click it → multi-node apply replaces "teh".
  const rep = page.locator('css=.inkly-card__rep').filter({ hasText: 'the' }).first();
  await expect(rep).toBeVisible({ timeout: 5_000 });
  await rep.click();
  await expect.poll(async () => await editor.innerText()).toContain('The quick the fox');
});
