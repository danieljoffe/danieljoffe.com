/**
 * Optimize AI-generated cover images for the portfolio.
 *
 * Usage:
 *   pnpm tsx scripts/optimize-covers.ts <input-dir>
 *
 * Input:  A directory of images named by content slug (any format sharp supports).
 *         e.g., unified-content-pipeline.png, fightcamp.jpg, winc.webp
 *
 * Output: Optimized WebP files at apps/root/public/images/covers/{slug}.webp
 *         - Max width: 1280px (largest Next.js deviceSize)
 *         - Quality: 80 (WebP)
 *         - Aspect ratio preserved
 *
 * The script validates that every content slug has a corresponding input image
 * and reports any missing or extra files.
 */

import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_WIDTH = 1280;
const QUALITY = 80;
const OUTPUT_DIR = resolve(__dirname, '../apps/root/public/images/covers');

/** All content slugs that need cover images. */
const EXPECTED_SLUGS = [
  // Blog (36)
  'accessible-dropdown-keyboard-nav',
  'auto-generated-toc-scroll-spy',
  'calendly-embed-timeout-fallback',
  'ci-docs-only-shell-detection',
  'client-side-tag-filtering-seo',
  'compose-providers-react-context',
  'cycling-theme-toggle',
  'documenting-design-tokens',
  'eslint-import-ordering-monorepo',
  'executable-style-guide-zod',
  'favicon-pipeline-one-svg',
  'form-api-alignment-aria',
  'funnel-session-id-analytics',
  'graceful-degradation-third-party-embeds',
  'hydration-mismatch-use-synced-state',
  'import-type-circular-dependency',
  'keyboard-navigable-data-tables',
  'mdx-single-source-of-truth',
  'minisearch-ranked-search-cmdk',
  'mobile-bottom-nav-z-index',
  'mobile-nav-a11y-bottom-sheet',
  'mobile-vr-data-driven-playwright',
  'pnpm-phantom-dependencies',
  'prefers-reduced-motion-component-library',
  'removing-focus-trap-react',
  'rule-of-three-design-systems',
  'sentry-skip-without-dsn',
  'shared-ui-design-system',
  'standardizing-component-size-scale',
  'static-site-search-cmdk',
  'storybook-interaction-tests-aria',
  'three-tools-monorepo-hygiene',
  'toast-pause-on-hover',
  'tooltip-aria-describedby-wrong-element',
  'typography-system-nextjs',
  'unified-content-pipeline',
  'visual-regression-ci-pipeline',
  // Projects (10)
  'accessibility-serials-study-case',
  'appcontext-simplification-case-study',
  'cms-tooling-case-study',
  'component-library-case-study',
  'contact-form-case-study',
  'logistics-dashboard-study-case',
  'performance-case-study',
  'portfolio-modern-practice-study-case',
  'ui-components-v1',
  'ui-components-v2',
  // Experience (4)
  'fightcamp',
  'internet-brands',
  'professional-development',
  'the-library-corporation',
  'winc',
] as const;

async function main() {
  const inputDir = process.argv[2];

  if (!inputDir) {
    console.error('Usage: pnpm tsx scripts/optimize-covers.ts <input-dir>');
    console.error(
      'Example: pnpm tsx scripts/optimize-covers.ts ~/Downloads/covers'
    );
    process.exit(1);
  }

  const resolvedInput = resolve(inputDir);
  if (!existsSync(resolvedInput)) {
    console.error(`Input directory not found: ${resolvedInput}`);
    process.exit(1);
  }

  // Scan input directory — map slug (filename without extension) to full path
  const inputFiles = readdirSync(resolvedInput).filter(f => !f.startsWith('.'));
  const inputMap = new Map<string, string>();
  for (const file of inputFiles) {
    const { name } = parse(file);
    inputMap.set(name, join(resolvedInput, file));
  }

  // Validate coverage
  const expectedSet = new Set<string>(EXPECTED_SLUGS);
  const missing = EXPECTED_SLUGS.filter(s => !inputMap.has(s));
  const extra = [...inputMap.keys()].filter(s => !expectedSet.has(s));

  if (missing.length > 0) {
    console.warn(`\n Missing images (${missing.length}):`);
    for (const slug of missing) console.warn(`  - ${slug}`);
  }
  if (extra.length > 0) {
    console.warn(`\n Extra images not matching any slug (${extra.length}):`);
    for (const slug of extra) console.warn(`  - ${slug}`);
  }

  // Only process images that match expected slugs
  const toProcess = EXPECTED_SLUGS.filter(s => inputMap.has(s));
  if (toProcess.length === 0) {
    console.error('\nNo matching images found. Nothing to do.');
    process.exit(1);
  }

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\nProcessing ${toProcess.length} images...\n`);

  let totalInputBytes = 0;
  let totalOutputBytes = 0;

  for (const slug of toProcess) {
    const inputPath = inputMap.get(slug)!;
    const outputPath = join(OUTPUT_DIR, `${slug}.webp`);

    const inputSize = statSync(inputPath).size;
    totalInputBytes += inputSize;

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const inputWidth = metadata.width ?? 0;
    const inputHeight = metadata.height ?? 0;

    // Resize only if wider than MAX_WIDTH
    const pipeline =
      inputWidth > MAX_WIDTH ? image.resize({ width: MAX_WIDTH }) : image;

    const { size: outputSize } = await pipeline
      .webp({ quality: QUALITY })
      .toFile(outputPath);

    totalOutputBytes += outputSize;

    const reduction =
      inputSize > 0 ? ((1 - outputSize / inputSize) * 100).toFixed(0) : '?';
    const dims =
      inputWidth > MAX_WIDTH
        ? `${inputWidth}x${inputHeight} -> ${MAX_WIDTH}x${Math.round((inputHeight / inputWidth) * MAX_WIDTH)}`
        : `${inputWidth}x${inputHeight} (no resize)`;

    console.log(
      `  ${slug}.webp  ${dims}  ${formatBytes(inputSize)} -> ${formatBytes(outputSize)} (${reduction}% smaller)`
    );
  }

  console.log(`\n--- Summary ---`);
  console.log(
    `  Processed: ${toProcess.length}/${EXPECTED_SLUGS.length} images`
  );
  console.log(`  Total input:  ${formatBytes(totalInputBytes)}`);
  console.log(`  Total output: ${formatBytes(totalOutputBytes)}`);
  console.log(
    `  Savings: ${formatBytes(totalInputBytes - totalOutputBytes)} (${((1 - totalOutputBytes / totalInputBytes) * 100).toFixed(0)}%)`
  );
  console.log(`  Output: ${OUTPUT_DIR}\n`);

  if (missing.length > 0) {
    console.warn(
      `${missing.length} images still missing. Re-run after adding them.\n`
    );
    process.exit(1);
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
