import { test, expect } from './_extension';

test('Harper (via offscreen) underlines a real grammar error', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I has a apple'); // subject-verb + "a apple"->"an apple"

  // Offscreen cold-start compiles ~17 MB of WASM on first lint — allow generous time.
  const underline = page.locator('css=div.inkly-underline');
  await expect(underline.first()).toBeVisible({ timeout: 30_000 });
});

test('a clean sentence produces no underlines', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('The quick brown fox jumps over the lazy dog.');
  await page.waitForTimeout(3_000); // let a lint round complete
  await expect(page.locator('css=div.inkly-underline')).toHaveCount(0);
});
