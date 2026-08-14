// Packaging contract for the published @danieljoffe/shared-ui package.
//
// Two classes of drift have shipped to npm unnoticed, because nothing reads
// package.json and README.md against each other:
//
//   1. The README told consumers to `@import
//      '@danieljoffe/shared-ui/styles/theme.css'` — the headline theme-setup
//      step — for every release after theme.css was renamed to
//      indigo-theme.css (76a6275). No export matched, so the documented
//      quick start failed to resolve.
//   2. `files` and `exports` drifted apart in both directions: CHANGELOG.md
//      was exported to nobody because `files` omitted it, and three
//      Storybook-only stylesheets shipped that no export path could reach.
//
// These are pure static checks on the manifest and the README, so they run in
// the fast lane with the rest of the unit suite — no build, no pack.
//
// Boundary: without a build these can prove a documented subpath resolves into
// a *published directory*, not that the specific file inside it exists. So a
// README naming a component that no longer exists still passes here — that one
// is caught loudly elsewhere, since apps/root and Storybook import every
// component directly. Stylesheets had no such second reader, which is exactly
// why `styles/theme.css` rotted unnoticed, and why they are held to the
// stricter explicit-key rule below.
//
// The CI packaging job (.github/workflows/shared-ui-package-check.yml) covers
// what needs a real build: that `npm pack` actually emits the required files
// and that no source leaks in.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PKG_ROOT = join(__dirname, '..', '..');

const pkg = JSON.parse(
  readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')
) as {
  name: string;
  files: string[];
  exports: Record<string, unknown>;
};
const readme = readFileSync(join(PKG_ROOT, 'README.md'), 'utf8');

/**
 * Resolution condition Nx/Vite use to point at TypeScript source inside this
 * monorepo. It is never matched by an installed consumer, so its targets are
 * deliberately absent from the tarball and excluded from the check below.
 */
const WORKSPACE_SOURCE_CONDITION = '@danieljoffe.com/source';

/**
 * Every concrete (wildcard-free) target a *consumer* can resolve through the
 * `exports` map.
 */
function concreteExportTargets(): string[] {
  const targets: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      if (!node.includes('*')) targets.push(node);
      return;
    }
    if (node && typeof node === 'object') {
      for (const [condition, value] of Object.entries(node)) {
        if (condition === WORKSPACE_SOURCE_CONDITION) continue;
        walk(value);
      }
    }
  };
  walk(pkg.exports);
  return [...new Set(targets)];
}

/**
 * npm's `files` semantics, narrowed to what this manifest uses: an entry is
 * either the exact path or a directory prefix of it. package.json is always
 * published regardless of `files`.
 */
function isPublished(path: string): boolean {
  const rel = path.replace(/^\.\//, '');
  if (rel === 'package.json') return true;
  return pkg.files.some(
    entry => rel === entry || rel.startsWith(`${entry.replace(/\/$/, '')}/`)
  );
}

/** Subpaths the README tells consumers to import, e.g. `./styles/foo.css`. */
function readmeSubpaths(): string[] {
  const re = new RegExp(`${pkg.name}(/[^'"\`\\s)]+)?`, 'g');
  const found = [...readme.matchAll(re)].map(m => (m[1] ? `.${m[1]}` : '.'));
  return [...new Set(found)];
}

/**
 * Whether a consumer's `import '@danieljoffe/shared-ui<subpath>'` resolves to
 * a file this package actually ships.
 *
 * A stylesheet must match an *explicit* exports key. Matching the `./styles/*`
 * wildcard is not enough and is precisely how the README's dead
 * `styles/theme.css` went unnoticed: that wildcard targets
 * `./dist/lib/styles/<name>.js`, so a `.css` subpath "matched" the pattern
 * while resolving to `dist/lib/styles/theme.css.js`, which has never existed.
 */
function resolvesToShippedFile(subpath: string): boolean {
  const entries = Object.entries(pkg.exports);
  const isStylesheet = /\.(css|scss)$/.test(subpath);

  const exact = entries.find(([key]) => key === subpath);
  if (exact) return concreteTargetsOf(exact[1]).every(isPublished);
  if (isStylesheet) return false;

  return entries.some(([key, value]) => {
    if (!key.includes('*')) return false;
    const [prefix = '', suffix = ''] = key.split('*');
    if (
      !subpath.startsWith(prefix) ||
      !subpath.endsWith(suffix) ||
      subpath.length < prefix.length + suffix.length
    ) {
      return false;
    }
    const star = subpath.slice(prefix.length, subpath.length - suffix.length);
    return concreteTargetsOf(value, star).every(isPublished);
  });
}

/** Consumer-facing targets of an exports value, with `*` substituted. */
function concreteTargetsOf(value: unknown, star = ''): string[] {
  const targets: string[] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string') {
      targets.push(node.replace('*', star));
      return;
    }
    if (node && typeof node === 'object') {
      for (const [condition, child] of Object.entries(node)) {
        if (condition === WORKSPACE_SOURCE_CONDITION) continue;
        walk(child);
      }
    }
  };
  walk(value);
  return targets;
}

describe('published package surface', () => {
  it('publishes every file the exports map points at', () => {
    const unpublished = concreteExportTargets().filter(t => !isPublished(t));
    expect(unpublished).toEqual([]);
  });

  it('publishes the changelog, licence and readme', () => {
    for (const file of ['CHANGELOG.md', 'LICENSE.md', 'README.md']) {
      expect(pkg.files).toContain(file);
    }
  });

  it('resolves every package subpath the README tells consumers to import', () => {
    const broken = readmeSubpaths().filter(s => !resolvesToShippedFile(s));
    expect(broken).toEqual([]);
  });

  it('keeps CSS out of the sideEffects-free claim so bundlers cannot drop it', () => {
    // `sideEffects: false` lets webpack tree-shake a consumer's
    // `import '@danieljoffe/shared-ui/styles/indigo-theme.css'` away entirely,
    // because the package would be claiming no module in it has an effect.
    const sideEffects = (pkg as unknown as { sideEffects: unknown })
      .sideEffects;
    expect(Array.isArray(sideEffects)).toBe(true);
    expect(sideEffects).toEqual(
      expect.arrayContaining([expect.stringContaining('.css')])
    );
  });
});
