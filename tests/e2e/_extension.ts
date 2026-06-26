import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

const extensionPath = path.resolve('.output/chrome-mv3');

// NOTE: Playwright's bundled Chromium ships as "Chrome Headless Shell" which does
// NOT support --load-extension (extensions are disabled in that binary). Only the
// full Chromium/Chrome binary supports extensions in headless mode via --headless=new.
// We therefore run headed (headless:false). On a CI machine without a display, wrap
// the test run with `xvfb-run` or set DISPLAY before running `npm run test:e2e`.
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    await use(context);
    await context.close();
  },
});

export const expect = test.expect;
