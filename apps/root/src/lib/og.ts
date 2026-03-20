import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UNSPLASH_PHOTOS_URL } from '@/utils/constants';

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
    readFile(join(dir, 'Fraunces-Bold.ttf')),
  ]);
}

function loadProfileImage(): Promise<Buffer> {
  return readFile(
    join(process.cwd(), 'public', 'images', 'daniel-joffe-profile.webp')
  );
}

export async function getOgFonts() {
  if (!_fontsPromise) _fontsPromise = loadFonts();
  const [interRegular, interMedium, frauncesRegular] = await _fontsPromise;

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
      name: 'Fraunces',
      data: frauncesRegular,
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

export function getUnsplashUrl(
  src: string,
  width: number,
  height: number
): string {
  return `${UNSPLASH_PHOTOS_URL}${src}?w=${width}&h=${height}&fit=crop&auto=format&q=80`;
}

export async function getUnsplashImageBase64(
  src: string,
  width: number,
  height: number
): Promise<string | null> {
  const url = getUnsplashUrl(src, width, height);
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get('content-type') ?? 'image/jpeg';
    return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
  } catch {
    return null;
  }
}
