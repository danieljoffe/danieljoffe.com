/**
 * Generate cover images for blog posts and project case studies using
 * Gemini Imagen via the Vercel AI SDK.
 *
 * Reads each MDX file's `cover.alt` text (the visual brief) and `title`,
 * sends them to Imagen with a consistent in-house style prompt, writes the
 * raw PNG to a temp dir, then hands off to scripts/optimize-covers.ts to
 * produce the final webp at apps/root/public/images/covers/<slug>.webp.
 *
 * Usage:
 *   pnpm gen:cover <slug> [<slug> ...]   Generate for specific slug(s)
 *   pnpm gen:cover --missing             Generate for every MDX whose cover
 *                                        file doesn't exist on disk
 *   pnpm gen:cover --regenerate <slug>   Force regenerate an existing cover
 *
 * Required env:
 *   GOOGLE_GENERATIVE_AI_API_KEY  Google AI Studio key (free tier is fine)
 *
 * Tunable knobs at the top of the file:
 *   COVER_STYLE  — global art-direction prefix prepended to every prompt
 *   MODEL_ID     — Imagen model variant
 *   ASPECT_RATIO — '16:9' to match existing covers
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { experimental_generateImage as generateImage } from 'ai';
import { google } from '@ai-sdk/google';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const CONTENT_DIRS = [
  resolve(REPO_ROOT, 'apps/root/src/data/content/blog'),
  resolve(REPO_ROOT, 'apps/root/src/data/content/projects'),
  resolve(REPO_ROOT, 'apps/root/src/data/content/experience'),
];
const COVERS_OUT_DIR = resolve(REPO_ROOT, 'apps/root/public/images/covers');
const TEMP_DIR = resolve(REPO_ROOT, '.tmp/covers-in');

// Tunable: art direction for every cover. Keeps the visual identity
// consistent across blog posts and case studies. Adjust here, not per file.
const COVER_STYLE = `Photorealistic, cinematic, editorial photography. 16:9 landscape composition.
Soft natural light, slight depth of field. Muted, slightly cool color palette with one accent color.
No text, no logos, no people, no UI screenshots. Centered or rule-of-thirds composition.
Subject:`;

const MODEL_ID = 'imagen-4.0-generate-001';
const ASPECT_RATIO = '16:9' as const;

interface Frontmatter {
  slug: string;
  title: string;
  coverSrc: string;
  coverAlt: string;
  file: string;
}

function parseFrontmatter(mdxPath: string): Frontmatter | null {
  const src = readFileSync(mdxPath, 'utf8');
  const slug = src.match(/slug:\s*['"]([^'"]+)['"]/)?.[1];
  const title = src.match(/title:\s*['"]([^'"]+)['"]/)?.[1];
  const coverSrc = src.match(/src:\s*['"]([^'"]+\.webp)['"]/)?.[1];
  const coverAlt = src.match(/alt:\s*['"]([^'"]+)['"]/)?.[1];
  if (!slug || !title || !coverSrc || !coverAlt) return null;
  return { slug, title, coverSrc, coverAlt, file: mdxPath };
}

function loadAllFrontmatter(): Frontmatter[] {
  const out: Frontmatter[] = [];
  for (const dir of CONTENT_DIRS) {
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.mdx')) continue;
      const fm = parseFrontmatter(join(dir, file));
      if (fm) out.push(fm);
    }
  }
  return out;
}

function coverExists(fm: Frontmatter): boolean {
  const filename = fm.coverSrc.split('/').pop()!;
  return existsSync(join(COVERS_OUT_DIR, filename));
}

function buildPrompt(fm: Frontmatter): string {
  // The alt text is already the visual brief — the author already described
  // the metaphor they want. Style prefix keeps the art direction consistent.
  return `${COVER_STYLE} ${fm.coverAlt}`;
}

async function generateOne(fm: Frontmatter): Promise<void> {
  const prompt = buildPrompt(fm);
  console.log(`\n→ ${fm.slug}`);
  console.log(`  alt:    ${fm.coverAlt}`);
  console.log(`  model:  ${MODEL_ID}`);

  const start = Date.now();
  const { image } = await generateImage({
    model: google.image(MODEL_ID),
    prompt,
    aspectRatio: ASPECT_RATIO,
  });

  mkdirSync(TEMP_DIR, { recursive: true });
  const tempPath = join(TEMP_DIR, `${fm.slug}.png`);
  writeFileSync(tempPath, image.uint8Array);
  console.log(`  saved:  ${tempPath} (${(Date.now() - start) / 1000}s)`);
}

function optimize(slugs: string[]): void {
  console.log(
    `\nOptimizing ${slugs.length} image(s) via scripts/optimize-covers.ts…`
  );
  execFileSync(
    'pnpm',
    ['tsx', 'scripts/optimize-covers.ts', TEMP_DIR, ...slugs],
    { stdio: 'inherit', cwd: REPO_ROOT }
  );
}

async function main(): Promise<void> {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error(
      '✗ GOOGLE_GENERATIVE_AI_API_KEY is not set.\n' +
        '  Get a key at https://aistudio.google.com/app/apikey and export it,\n' +
        '  or set it in apps/root/.env.local'
    );
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const all = loadAllFrontmatter();
  let targets: Frontmatter[] = [];

  if (args.includes('--missing')) {
    targets = all.filter(fm => !coverExists(fm));
    if (targets.length === 0) {
      console.log('✓ No missing covers. Nothing to do.');
      return;
    }
    console.log(`Found ${targets.length} missing cover(s):`);
    for (const fm of targets) console.log(`  - ${fm.slug}`);
  } else if (args.includes('--regenerate')) {
    const slugs = args.filter(a => !a.startsWith('--'));
    if (slugs.length === 0) {
      console.error('✗ --regenerate requires one or more slug arguments.');
      process.exit(1);
    }
    targets = all.filter(fm => slugs.includes(fm.slug));
    const missing = slugs.filter(s => !targets.some(t => t.slug === s));
    if (missing.length) {
      console.error(`✗ Unknown slug(s): ${missing.join(', ')}`);
      process.exit(1);
    }
    console.log(`Regenerating ${targets.length} cover(s):`);
    for (const fm of targets) console.log(`  - ${fm.slug}`);
  } else {
    const slugs = args.filter(a => !a.startsWith('--'));
    if (slugs.length === 0) {
      console.error(
        'Usage:\n' +
          '  pnpm gen:cover <slug> [<slug> ...]   generate specific slug(s)\n' +
          '  pnpm gen:cover --missing             generate every missing cover\n' +
          '  pnpm gen:cover --regenerate <slug>   force regenerate'
      );
      process.exit(1);
    }
    targets = all.filter(fm => slugs.includes(fm.slug));
    const missing = slugs.filter(s => !targets.some(t => t.slug === s));
    if (missing.length) {
      console.error(`✗ Unknown slug(s): ${missing.join(', ')}`);
      console.error(
        '  Slugs must match the `slug` field in an MDX file under',
        CONTENT_DIRS.map(d => d.replace(`${REPO_ROOT}/`, '')).join(' or ')
      );
      process.exit(1);
    }
  }

  for (const fm of targets) {
    try {
      await generateOne(fm);
    } catch (err) {
      console.error(
        `✗ ${fm.slug} failed:`,
        err instanceof Error ? err.message : err
      );
      process.exitCode = 1;
    }
  }

  const generated = targets
    .map(t => t.slug)
    .filter(slug => existsSync(join(TEMP_DIR, `${slug}.png`)));

  if (generated.length > 0) optimize(generated);

  console.log(`\nDone. ${generated.length}/${targets.length} generated.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
