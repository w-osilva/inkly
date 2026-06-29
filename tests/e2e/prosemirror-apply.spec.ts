import { test, expect } from './_extension';

/**
 * M4b Task 2 — applying a suggestion in a real ProseMirror editor.
 *
 * Detection + underlining already worked on a real PM editor; Task 2 makes
 * APPLY stick. FieldType 'prosemirror' now routes through the same
 * native-editing (execCommand/beforeinput) path as plain contenteditable, so
 * the edit reconciles into the PM model (`__pmText`).
 *
 * Apply is driven through the real UI (hover underline -> suggestion card ->
 * click replacement), which runs in the content-script (isolated) world and
 * actually reaches `applyReplacement`. NOTE: the `window.__inklyApplyFirst`
 * e2e hook lives in the isolated world and is NOT reachable from
 * `page.evaluate` (main world), so it cannot be used to exercise apply here.
 */
async function hoverUntilCard(page: import('@playwright/test').Page) {
  const underline = page.locator('css=div.inkly-underline').first();
  await expect(underline).toBeVisible({ timeout: 8_000 });
  const card = page.locator('css=.inkly-card');
  await expect(async () => {
    const box = await underline.boundingBox();
    if (!box) throw new Error('no underline bounding box');
    const x = box.x + box.width / 2;
    const y = box.y - 4; // nudge up from the 2px strip into the text rect
    await page.mouse.click(x, y);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('applying a suggestion updates the ProseMirror model', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/prosemirror.html');
  await page.locator('css=.ProseMirror').click();

  // Detection works: the real PM editor gets a correctness underline on "teh".
  await expect(
    page.locator('css=div.inkly-underline[data-severity="correctness"]').first(),
  ).toBeVisible({ timeout: 6_000 });

  // Apply via the real card UI (reaches applyReplacement in the content world).
  await hoverUntilCard(page);
  await page.locator('css=.inkly-card .inkly-card__rep').first().click();
  await page.waitForTimeout(400);

  // The PM model must reflect the applied replacement.
  const text = await page.evaluate(
    () => (window as unknown as { __pmText: () => string }).__pmText(),
  );
  expect(text).toContain('the cat');
  expect(text).not.toContain('teh');
});
