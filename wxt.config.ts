import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // Keep the e2e build (VITE_INKLY_E2E) in a separate dir so running tests never
  // overwrites the production .output/ that the user loads as an unpacked extension.
  outDir: process.env.VITE_INKLY_E2E ? '.output-e2e' : '.output',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Inkly',
    description:
      'Open-source, privacy-first writing assistant for Chrome/Edge/Brave — local grammar & spelling + optional AI.',
    icons: {
      16: '/icon/16.png',
      32: '/icon/32.png',
      48: '/icon/48.png',
      96: '/icon/96.png',
      128: '/icon/128.png',
    },
    permissions: ['storage', 'contextMenus', 'offscreen'],
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
    },
    commands: {
      'inkly-open-ai': {
        suggested_key: { default: 'Alt+I' },
        description: 'Open inkly AI on the current selection',
      },
    },
  },
});
