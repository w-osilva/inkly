import * as esbuild from 'esbuild';
const r = await esbuild.build({
  entryPoints: ['tests/e2e/fixtures/src/pm-editor.ts'],
  outfile: 'tests/e2e/fixtures/vendor/pm-editor.js',
  bundle: true, format: 'iife', minify: true, platform: 'browser', logLevel: 'info',
});
console.log('built pm-editor.js', r);
