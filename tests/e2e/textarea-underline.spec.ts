import { test, expect } from './_extension';

// Playwright boundingBox() returns viewport coords as { x, y, width, height }.
type Box = { x: number; y: number; width: number; height: number };

test('textarea underline is precise (under the word), not full-field', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('/textarea.html');

  const ta = page.locator('#ta');
  await ta.click();
  // "misspeld" starts mid-line (col 10), so a precise underline must be offset
  // from the field's left edge and far narrower than the whole field.
  // Second line gives us a distinct vertical position to prove line awareness.
  await ta.type('This is a misspeld word.\nHere is a wrng one.');
  await page.waitForTimeout(600);

  const underline = page.locator('css=div.inkly-underline[data-severity="correctness"]');
  await expect(underline.first()).toBeVisible({ timeout: 5000 });

  // Field box in viewport coords.
  const field = (await ta.boundingBox()) as Box;
  expect(field).not.toBeNull();

  // Collect all underline boxes.
  const handles = await underline.all();
  const boxes: Box[] = [];
  for (const h of handles) {
    const b = await h.boundingBox();
    if (b) boxes.push(b);
  }
  expect(boxes.length).toBeGreaterThan(0);

  // 1) Precise, not full-field: the narrowest underline is clearly less than
  //    the field width. The OLD coarse code produced a near-full-width bar.
  const minWidth = Math.min(...boxes.map((b) => b.width));
  expect(minWidth).toBeLessThan(field.width * 0.6);

  // 2) Offset from the left edge: at least one underline starts well inside the
  //    field (a word that does not begin at column 0). The OLD bar sat at the
  //    field's left edge (x ~= field.x + 2).
  const maxLeftOffset = Math.max(...boxes.map((b) => b.x - field.x));
  expect(maxLeftOffset).toBeGreaterThan(15);

  // 3) Line awareness: underlines exist at two distinct vertical positions, and
  //    the lowest is at least ~a line height below the highest. The OLD code
  //    produced a single full-field rect (one top value).
  const tops = boxes.map((b) => b.y).sort((a, b) => a - b);
  const minTop = tops[0];
  const maxTop = tops[tops.length - 1];
  expect(maxTop - minTop).toBeGreaterThan(10);
});
