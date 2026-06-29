import { test as base, chromium, type BrowserContext } from '@playwright/test';
import path from 'node:path';

// The e2e build (VITE_INKLY_E2E) goes to .output-e2e so it never clobbers the
// production .output the user loads. See wxt.config.ts outDir.
const extensionPath = path.resolve('.output-e2e/chrome-mv3');

// Extensions need the FULL Chromium, not Playwright's "Chrome Headless Shell" (which
// disables --load-extension). Default: headed (a visible window). Set INKLY_E2E_HEADLESS=1
// to run windowless via `channel: 'chromium'` + the new headless mode, which keeps full
// extension support — handy on WSL/WSLg where the headed window steals focus.
const headless = !!process.env.INKLY_E2E_HEADLESS;
export const test = base.extend<{ context: BrowserContext }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: headless ? 'chromium' : undefined,
      headless,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        ...(headless ? ['--headless=new'] : []),
      ],
    });
    await use(context);
    await context.close();
  },
});

export const expect = test.expect;
