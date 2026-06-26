import { test, expect } from './_extension';

// M2a spike: prove Harper lints end-to-end in the built MV3 extension.
// "I has a apple" has multiple clear errors Harper catches (a->an, subject-verb).
test('Harper produces an underline for a real grammar error', async ({ context }) => {
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') errors.push(`[${msg.type()}] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));

  await page.goto('/contenteditable.html');
  const editor = page.locator('#editor');
  await editor.click();
  await editor.type('I has a apple');

  const underline = page.locator('css=div.inkly-underline');
  try {
    await expect(underline.first()).toBeVisible({ timeout: 15000 });
  } catch (e) {
    console.log('CAPTURED CONSOLE ERRORS/WARNINGS:\n' + errors.join('\n'));
    throw e;
  }
  expect(await underline.count()).toBeGreaterThanOrEqual(1);
});
