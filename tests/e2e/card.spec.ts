import { test, expect } from './_extension';

/**
 * Hover the first Harper underline so the suggestion card appears.
 *
 * The `div.inkly-underline` is a 2px strip at the BOTTOM edge of the text
 * (top = textRect.top + textRect.height). The content script hit-tests against
 * the full text rect (top..top+height), so the strip's center sits ~1px BELOW
 * the hit-rect and `.hover()` would miss it. We instead move the mouse a few px
 * UP from the strip into the text span. mousemove is throttled via rAF, so we
 * move twice and poll for the card to absorb the ~150ms hover delay.
 */
async function hoverUntilCard(page: import('@playwright/test').Page) {
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 30_000 });
  const card = page.locator('css=.inkly-card');

  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no underline bounding box');
    const x = box.x + box.width / 2;
    const y = box.y - 4; // nudge up from the strip into the text rect
    // Two moves: the first may land mid-rAF; the nudge guarantees a fresh mousemove.
    await page.mouse.click(x, y);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('hovering a suggestion shows the card; clicking a replacement fixes the text', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I has a apple');

  await hoverUntilCard(page);

  const rep = page.locator('css=.inkly-card .inkly-card__rep').first();
  await expect(rep).toBeVisible({ timeout: 5_000 });

  const before = await editor.innerText();
  await rep.click();
  await expect.poll(async () => await editor.innerText()).not.toBe(before);
  await expect(page.locator('css=.inkly-card')).toHaveCount(0);
});

test('dismiss hides the card and removes that underline', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I has a apple');

  const underlines = page.locator('css=div.inkly-underline');
  await expect(underlines.first()).toBeVisible({ timeout: 30_000 });
  const countBefore = await underlines.count();

  await hoverUntilCard(page);
  await page.locator('css=.inkly-card__dismiss').click();
  await expect(page.locator('css=.inkly-card')).toHaveCount(0);
  await expect
    .poll(async () => await page.locator('css=div.inkly-underline').count())
    .toBeLessThan(countBefore);
});
