/**
 * Optimize AI-generated cover images for the portfolio.
 *
 * Usage:
 *   pnpm tsx scripts/optimize-covers.ts <input-dir> <slug> [<slug> ...]
 *
 * Example:
 *   pnpm tsx scripts/optimize-covers.ts ~/Downloads/covers \
 *     parity-harness-silently-broken-service \
 *     railway-fastapi-playwright-deploy
 *
 * Input:  A directory containing images whose filename (sans extension)
 *         matches each slug, e.g. parity-harness-silently-broken-service.png.
 *
 * Output: Optimized WebP files at apps/root/public/images/covers/{slug}.webp
 *         - Max width: 1280px (largest Next.js deviceSize)
 *         - Quality: 80 (WebP)
 *         - Aspect ratio preserved
 */

import { readdirSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, parse, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MAX_WIDTH = 1280;
const QUALITY = 80;
const OUTPUT_DIR = resolve(__dirname, '../apps/root/public/images/covers');

async function main() {
  const [inputDir, ...slugs] = process.argv.slice(2);

  if (!inputDir || slugs.length === 0) {
    console.error(
      'Usage: pnpm tsx scripts/optimize-covers.ts <input-dir> <slug> [<slug> ...]'
    );
    console.error(
      'Example: pnpm tsx scripts/optimize-covers.ts ~/Downloads/covers my-post-slug'
    );
    process.exit(1);
  }

  const resolvedInput = resolve(inputDir);
  if (!existsSync(resolvedInput)) {
    console.error(`Input directory not found: ${resolvedInput}`);
    process.exit(1);
  }

  const inputMap = new Map<string, string>();
  for (const file of readdirSync(resolvedInput).filter(
    f => !f.startsWith('.')
  )) {
    inputMap.set(parse(file).name, join(resolvedInput, file));
  }

  const missing = slugs.filter(s => !inputMap.has(s));
  if (missing.length > 0) {
    console.error(`\nMissing images for ${missing.length} slug(s):`);
    for (const slug of missing) console.error(`  - ${slug}`);
    console.error(
      `\nExpected a file named <slug>.<ext> in ${resolvedInput} for each slug.`
    );
    process.exit(1);
  }

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`\nProcessing ${slugs.length} image(s)...\n`);

  let totalInputBytes = 0;
  let totalOutputBytes = 0;

  for (const slug of slugs) {
    const inputPath = inputMap.get(slug)!;
    const outputPath = join(OUTPUT_DIR, `${slug}.webp`);

    const inputSize = statSync(inputPath).size;
    totalInputBytes += inputSize;

    const image = sharp(inputPath);
    const metadata = await image.metadata();
    const inputWidth = metadata.width ?? 0;
    const inputHeight = metadata.height ?? 0;

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
  console.log(`  Processed: ${slugs.length} image(s)`);
  console.log(`  Total input:  ${formatBytes(totalInputBytes)}`);
  console.log(`  Total output: ${formatBytes(totalOutputBytes)}`);
  console.log(
    `  Savings: ${formatBytes(totalInputBytes - totalOutputBytes)} (${((1 - totalOutputBytes / totalInputBytes) * 100).toFixed(0)}%)`
  );
  console.log(`  Output: ${OUTPUT_DIR}\n`);
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
