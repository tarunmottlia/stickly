import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync } from 'node:fs';

const out = 'dist/w.js';

await build({
  entryPoints: ['src/index.tsx'],
  bundle: true, minify: true, format: 'iife', target: ['es2020'],
  jsx: 'automatic', jsxImportSource: 'preact',
  outfile: out, legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
});

const raw = readFileSync(out);
const gz = gzipSync(raw, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1) + ' kB';
console.log(`w.js  ${kb(raw.length)} raw  ·  ${kb(gz)} gzip`);
if (gz > 25 * 1024) {
  console.error(`BUDGET EXCEEDED: ${kb(gz)} > 25.0 kB gzip`);
  process.exit(1);
}
writeFileSync('dist/w.js.size', `${gz}\n`);
