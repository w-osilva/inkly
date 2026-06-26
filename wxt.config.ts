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
  },
});
