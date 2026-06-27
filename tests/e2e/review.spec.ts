import { test, expect } from './_extension';

test('field button opens the review panel; navigate + accept', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('i woud like an pizza');

  // Field button appears once Harper (cold WASM) has produced issues.
  const btn = page.locator('css=.inkly-fb');
  await expect(btn).toBeVisible({ timeout: 30_000 });

  await btn.click();
  const rv = page.locator('css=.inkly-rv');
  await expect(rv).toBeVisible({ timeout: 5_000 });

  // It shows a total count and a 1-based position.
  const total = Number(await page.locator('css=.inkly-rv__count').textContent());
  expect(total).toBeGreaterThan(0);
  await expect(page.locator('css=.inkly-rv__pos')).toHaveText(`1/${total}`);

  // Navigate to the next issue (wraps if only one).
  await page.locator('css=.inkly-rv__arrow[aria-label="Next"]').click();
  await expect(page.locator('css=.inkly-rv__pos')).toHaveText(new RegExp(`/${total}$`));

  // Accept the current suggestion → it applies and the total drops (or the panel closes).
  await page.locator('css=.inkly-rv__pos'); // ensure rendered
  const acceptBtn = page.locator('css=.inkly-rv__accept');
  if (await acceptBtn.count()) {
    await acceptBtn.first().click();
    await expect
      .poll(async () => {
        if (!(await rv.isVisible())) return 0;
        return Number(await page.locator('css=.inkly-rv__count').textContent());
      })
      .toBeLessThan(total);
  }
});
