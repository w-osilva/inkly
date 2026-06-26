import { test, expect } from './_extension';

/**
 * M4b Task 1 spike — real ProseMirror editor fixture.
 *
 * Demonstrates the current gap: detection + underlining work on a real PM
 * editor, but APPLYING a suggestion is a no-op for framework rich editors.
 * `apply-engine.ts applyRange` hits `return false` for FieldType 'prosemirror',
 * so neither the PM model (`__pmText`) nor the rendered DOM changes.
 *
 * Apply is driven through the real UI (hover underline -> suggestion card ->
 * click replacement), which runs in the content-script (isolated) world and
 * actually reaches `applyReplacement`. NOTE: the `window.__inklyApplyFirst`
 * e2e hook lives in the isolated world and is NOT reachable from
 * `page.evaluate` (main world), so it cannot be used to exercise apply here.
 *
 * Marked expected-to-fail so the committed suite stays green; M4b Task 2
 * (framework apply) flips this by removing `test.fail()`.
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
    await page.mouse.move(x, y);
    await page.mouse.move(x + 1, y);
    await expect(card).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 10_000 });
}

test('applying a suggestion updates the ProseMirror model', async ({ context }) => {
  test.fail(); // M4b Task 1 spike: apply is a no-op for framework editors until Task 2.
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

  // EXPECTED to fail today: the PM model is unchanged because applyRange
  // returns false for FieldType 'prosemirror'.
  const text = await page.evaluate(
    () => (window as unknown as { __pmText: () => string }).__pmText(),
  );
  expect(text).toContain('the cat');
  expect(text).not.toContain('teh');
});
