import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// Lazy-loaded font and image data, cached after first call.
// Uses readFile + process.cwd() (the official Next.js pattern for OG fonts).
// outputFileTracingIncludes in next.config.js ensures these files are bundled
// into Vercel serverless functions.
let _fontsPromise: Promise<Buffer[]> | null = null;
let _profilePromise: Promise<Buffer> | null = null;

function loadFonts(): Promise<Buffer[]> {
  const dir = join(process.cwd(), 'assets', 'fonts', 'og');
  return Promise.all([
    readFile(join(dir, 'Inter-Regular.ttf')),
    readFile(join(dir, 'Inter-Medium.ttf')),
    readFile(join(dir, 'Inter-Bold.ttf')),
  ]);
}

function loadProfileImage(): Promise<Buffer> {
  return readFile(
    join(process.cwd(), 'public', 'images', 'daniel-joffe-profile.webp')
  );
}

export async function getOgFonts() {
  if (!_fontsPromise) _fontsPromise = loadFonts();
  const [interRegular, interMedium, interBold] = await _fontsPromise;

  return [
    {
      name: 'Inter',
      data: interRegular,
      weight: 400 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: interMedium,
      weight: 500 as const,
      style: 'normal' as const,
    },
    {
      name: 'Inter',
      data: interBold,
      weight: 700 as const,
      style: 'normal' as const,
    },
  ];
}

export async function getProfileImageBase64(): Promise<string> {
  if (!_profilePromise) _profilePromise = loadProfileImage();
  const buffer = await _profilePromise;
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Read a local cover image from public/ and return it as a base64 data URL.
 * @param src - The public path, e.g. `/images/covers/slug.webp`
 */
export async function getCoverImageBase64(src: string): Promise<string | null> {
  try {
    // src is a public path like "/images/covers/slug.webp" — resolve to filesystem
    const filePath = join(process.cwd(), 'public', src.replace(/^\//, ''));
    const buffer = await readFile(filePath);
    const ext = src.split('.').pop()?.toLowerCase();
    const contentType = ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${contentType};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}
