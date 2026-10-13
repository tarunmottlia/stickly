import { build } from 'esbuild';

/** ESM and CJS from one source. Half of Node is still require(). */
for (const [format, ext] of [['esm', 'js'], ['cjs', 'cjs']]) {
  await build({
    entryPoints: ['src/index.ts'],
    outfile: `dist/index.${ext}`,
    bundle: true, platform: 'node', target: 'node18',
    format, sourcemap: true, legalComments: 'none',
  });
}
console.log('built dist/index.js + dist/index.cjs');
