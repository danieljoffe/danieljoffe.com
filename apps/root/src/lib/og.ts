import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UNSPLASH_PHOTOS_URL } from '@/utils/constants';

const FONTS_DIR = 'assets/fonts/og';

export async function getOgFonts() {
  const [interRegular, interMedium, frauncesRegular] = await Promise.all([
    readFile(join(process.cwd(), FONTS_DIR, 'Inter-Regular.ttf')),
    readFile(join(process.cwd(), FONTS_DIR, 'Inter-Medium.ttf')),
    readFile(join(process.cwd(), FONTS_DIR, 'Fraunces-Bold.ttf')),
  ]);

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
  const filePath = join(
    process.cwd(),
    'public/images/daniel-joffe-profile.png'
  );
  const buffer = await readFile(filePath);
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
