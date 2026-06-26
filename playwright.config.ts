import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:5193' },
  webServer: [
    {
      command: 'npx -y serve tests/e2e/fixtures -l 5193',
      url: 'http://localhost:5193/contenteditable.html',
      reuseExistingServer: true,
    },
    {
      command: 'node tests/e2e/fixtures/mock-llm.mjs',
      port: 5199,
      reuseExistingServer: true,
    },
  ],
});
