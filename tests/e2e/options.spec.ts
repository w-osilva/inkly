import { test, expect } from './_extension';

declare const chrome: { storage: { local: { get(k: string): Promise<Record<string, unknown>> } } };

test('the options page saves the BYOK config to storage.local', async ({ context }) => {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  const extId = new URL(sw.url()).host;

  const page = await context.newPage();
  await page.goto(`chrome-extension://${extId}/options.html`);

  // A custom endpoint requires the "Custom" provider preset.
  await page.locator('select').selectOption('custom');
  await page.locator('input[type="url"]').fill('https://api.example.com/v1');
  await page.locator('input[type="text"]').fill('gpt-test');
  await page.locator('input[type="password"]').fill('sk-secret');
  await page.locator('button').filter({ hasText: /Save|Salvar/ }).click();

  await expect(page.locator('css=.status.ok')).toBeVisible({ timeout: 5_000 });

  const stored = await sw.evaluate(async () => (await chrome.storage.local.get('inkly:ai'))['inkly:ai']);
  expect(stored).toMatchObject({ endpoint: 'https://api.example.com/v1', model: 'gpt-test', apiKey: 'sk-secret' });
});
