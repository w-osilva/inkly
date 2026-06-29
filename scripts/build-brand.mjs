// Generate Inkly extension icons (transparent PNGs) and a traced, themeable SVG mark
// from the source artwork at assets/brand/inkly.png. Run: node scripts/build-brand.mjs
import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { trace } from 'potrace';

const SRC = 'assets/brand/inkly.png';
const TMP = 'assets/brand/.master.png';
const ICON_DIR = 'public/icon';
const SVG_OUT = 'src/ui/inkly-mark.svg';
const INK = '#0F1729';
const INK_ACCENT = '#6366F1';

mkdirSync(ICON_DIR, { recursive: true });

// 1) Tight transparent master (drop the white background, trim padding).
execSync(`convert "${SRC}" -fuzz 12% -transparent white -trim +repage "${TMP}"`);

// 2) Recolor the mark to the brand indigo so the toolbar icon is visible on BOTH light
//    and dark browser toolbars (the original ink-navy vanished on a dark toolbar).
const TMP_ICON = 'assets/brand/.icon-master.png';
execSync(`convert "${TMP}" -fill "${INK_ACCENT}" -colorize 100 "${TMP_ICON}"`);

// 3) Square transparent icons, centered.
for (const size of [16, 32, 48, 96, 128]) {
  execSync(
    `convert "${TMP_ICON}" -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "${ICON_DIR}/${size}.png"`,
  );
}
rmSync(TMP_ICON, { force: true });
console.log('icons →', ICON_DIR, '(16/32/48/96/128, indigo)');

// 3) Trace the master into a single-color SVG, then make it themeable (currentColor).
await new Promise((resolve, reject) => {
  trace(TMP, { color: INK, background: 'transparent', threshold: 128, turdSize: 2 }, (err, svg) => {
    if (err) return reject(err);
    const themeable = svg
      .replace(new RegExp(INK, 'gi'), 'currentColor')
      // drop fixed width/height so it scales to the font/box; keep viewBox
      .replace(/\s(width|height)="[^"]*"/g, '');
    writeFileSync(SVG_OUT, themeable);
    console.log('svg →', SVG_OUT);
    resolve();
  });
});

rmSync(TMP, { force: true });
