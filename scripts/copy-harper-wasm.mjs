// Copies Harper's WASM binary out of node_modules into public/wasm/. Because it
// lives in public/, WXT emits it into the build output, and the offscreen
// extension page loads it same-origin (no web_accessible_resources needed).
// Run automatically via `prebuild` and `postinstall`. The file is gitignored
// (18 MB) and regenerated deterministically from the installed harper.js.
import { mkdirSync, copyFileSync, existsSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = resolve(root, 'node_modules/harper.js/dist/harper_wasm_bg.wasm');
const destDir = resolve(root, 'public/wasm');
const dest = resolve(destDir, 'harper_wasm_bg.wasm');

if (!existsSync(src)) {
  console.error(`[copy-harper-wasm] source not found: ${src} (is harper.js installed?)`);
  process.exit(1);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
const mb = (statSync(dest).size / 1024 / 1024).toFixed(1);
console.log(`[copy-harper-wasm] copied harper_wasm_bg.wasm (${mb} MB) -> public/wasm/`);
