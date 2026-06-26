import { test, expect } from './_extension';

declare const chrome: { storage: { local: { set(items: Record<string, unknown>): Promise<void> } } };

async function setAIConfig(context: import('@playwright/test').BrowserContext, value: unknown) {
  let [sw] = context.serviceWorkers();
  if (!sw) sw = await context.waitForEvent('serviceworker');
  await sw.evaluate(async (v) => { await chrome.storage.local.set({ 'inkly:ai': v }); }, value);
}

test('BYOK rewrite round-trips through the offscreen to the mock LLM', async ({ context }) => {
  await setAIConfig(context, {
    provider: 'openai-compatible', endpoint: 'http://localhost:5199/v1', apiKey: 'test-key', model: 'mock-1',
  });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  await page.waitForFunction(() => typeof (window as any).__inklyAIRewrite === 'function');
  const result = await page.evaluate(async () => await (window as any).__inklyAIRewrite('hello world'));
  expect(result).toBe('REWRITTEN: hello world');
});

test('rewrite returns a no-api-key error when unconfigured', async ({ context }) => {
  await setAIConfig(context, { provider: 'openai-compatible', endpoint: '', apiKey: '', model: '' });
  const page = await context.newPage();
  await page.goto('/contenteditable.html');
  await page.waitForFunction(() => typeof (window as any).__inklyAIRewrite === 'function');
  const result = await page.evaluate(async () => await (window as any).__inklyAIRewrite('hi'));
  expect(result).toBe('ERROR:no-api-key');
});
