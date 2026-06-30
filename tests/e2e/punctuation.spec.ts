import { test, expect } from './_extension';

// End-to-end proof that the deterministic punctuation checker reaches the UI: a missing
// space after a sentence-ending period gets underlined, and applying the fix corrects it.
// (Under e2e, LanguageTool is gated off for the public endpoint, so this underline can only
// come from the inkly punctuation rule — exactly what we're verifying.)

async function clickFirstUnderlineCard(page: import('@playwright/test').Page) {
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 30_000 });
  const card = page.locator('css=.inkly-card');
  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no underline bounding box');
    await page.mouse.click(box.x + box.width / 2, box.y - 4);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('underlines and fixes a missing space after a period', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/textarea.html');
  const ta = page.locator('#ta');
  await ta.click();
  await ta.type('We met home.Then we left');

  await clickFirstUnderlineCard(page);
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();
  await expect(ta).toHaveValue('We met home. Then we left');
});
