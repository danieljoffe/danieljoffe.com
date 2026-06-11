/// <reference types='vitest' />
import { readdirSync } from 'node:fs';
import * as path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// Build one ES module per source file (preserveModules) so consumers can deep-
// import subpaths from node_modules, e.g. `@danieljoffe/shared-ui/Text` →
// `dist/lib/Text.js`. The published package previously shipped only a single
// bundled `dist/index.js`, so the `./*` exports subpaths resolved to raw
// `src/lib/*.tsx` (workspace-only, via the `@danieljoffe.com/source` condition)
// and broke when consumed from npm. Multi-entry + preserveModules makes the JS
// layout mirror the per-component `.d.ts` files vite-plugin-dts already emits.
const SKIP = /\.(spec|stories|test)\.(ts|tsx)$|\.d\.ts$/;
function collect(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(path.resolve(__dirname, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...collect(rel));
    else if (/\.(ts|tsx)$/.test(e.name) && !SKIP.test(e.name)) out.push(rel);
  }
  return out;
}
const entry = Object.fromEntries(
  ['src/index.ts', ...collect('src/lib')].map(f => [
    f.replace(/^src\//, '').replace(/\.(ts|tsx)$/, ''),
    path.resolve(__dirname, f),
  ])
);

export default defineConfig(() => ({
  root: __dirname,
  cacheDir: '../../../node_modules/.vite/libs/shared/ui',
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      tsconfigPath: path.join(__dirname, 'tsconfig.lib.json'),
    }),
  ],
  // Configuration for building your library.
  // See: https://vitejs.dev/guide/build.html#library-mode
  build: {
    outDir: './dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    lib: {
      // Multiple entry points — one per component/util/style module — so each
      // is independently importable from the published package.
      entry,
      formats: ['es' as const],
    },
    rollupOptions: {
      // Peer/runtime deps consumers install themselves — keep them out of the
      // build so they aren't duplicated across the per-module chunks.
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'clsx',
        'tailwind-merge',
        /^lucide-react/,
      ],
      output: {
        // Mirror the src tree into dist (dist/index.js, dist/lib/Text.js, …)
        // so output JS aligns 1:1 with the emitted .d.ts files.
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
  },
}));
