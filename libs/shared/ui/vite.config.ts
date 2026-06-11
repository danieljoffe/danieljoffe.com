/// <reference types='vitest' />
import { readdirSync } from 'node:fs';
import * as path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import dts from 'vite-plugin-dts';

// Rollup strips module-level `"use client"`/`"use server"` directives under
// preserveModules, which makes the per-component dist files crash Next.js
// Server Component builds (the file uses client hooks but no longer declares
// the boundary). Capture each module's directive before transforms run, then
// re-emit it at the top of the matching emitted chunk.
const DIRECTIVE_RE =
  /^(?:\s*(?:\/\/[^\n]*|\/\*[\s\S]*?\*\/))*\s*(['"])use (client|server)\1/;
function preserveDirectives(): Plugin {
  const directives = new Map<string, string>();
  return {
    name: 'preserve-use-directives',
    enforce: 'pre',
    transform(code, id) {
      const match = DIRECTIVE_RE.exec(code);
      if (match) directives.set(id, `'use ${match[2]}';`);
      return null;
    },
    renderChunk(code, chunk) {
      const id = chunk.facadeModuleId;
      const directive = id ? directives.get(id) : undefined;
      if (!directive) return null;
      return { code: `${directive}\n${code}`, map: null };
    },
  };
}

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
    preserveDirectives(),
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
