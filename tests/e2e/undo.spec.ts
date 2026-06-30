import { test, expect } from './_extension';

// Applying a suggestion must be undoable with Ctrl+Z. We apply via execCommand so the edit
// lands on the field's native undo stack — setting .value directly would wipe it. We drive
// the real UI (click underline → click a replacement) so the isolated-world apply runs.

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

test('Ctrl+Z reverts an applied fix in a textarea', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/textarea.html');
  const ta = page.locator('#ta');
  await ta.click();
  await ta.type('teh cat');

  await clickFirstUnderlineCard(page);
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();
  await expect(ta).toHaveValue('the cat');

  await ta.focus();
  await page.keyboard.press('Control+z');
  await expect(ta).toHaveValue('teh cat');
});

test('Ctrl+Z reverts an applied fix in a contenteditable', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('teh cat');

  await clickFirstUnderlineCard(page);
  const before = await editor.innerText();
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();
  await expect.poll(async () => await editor.innerText()).not.toBe(before);

  await editor.focus();
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await editor.innerText()).trim()).toBe('teh cat');
});
