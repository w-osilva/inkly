import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'inkly',
    description:
      'Open-source, privacy-first writing assistant for Chrome/Edge/Brave — local grammar & spelling + optional AI.',
    permissions: ['storage', 'contextMenus', 'offscreen'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    // Harper's WASM binary is fetched at runtime by the linter worker via
    // browser.runtime.getURL('wasm/harper_wasm_bg.wasm'); it must be web-accessible.
    web_accessible_resources: [
      {
        resources: [
          'wasm/*.wasm',
          // The Harper worker (unlisted script) is loaded from the extension
          // origin by the content script; it and any shared chunks it imports
          // must be web-accessible.
          'harper-worker.js',
          'chunks/*.js',
          'assets/*.js',
        ],
        matches: ['<all_urls>'],
      },
    ],
  },
});
