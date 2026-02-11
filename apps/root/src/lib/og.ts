import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { UNSPLASH_PHOTOS_URL } from '@/utils/constants';

async function fetchGoogleFont(
  family: string,
  weight: number
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`;
  const css = await fetch(cssUrl, {
    headers: {
      // Use a user-agent that triggers TrueType format (not woff2)
      'User-Agent':
        'Mozilla/5.0 (BB10; Touch) AppleWebKit/537.1+ (KHTML, like Gecko) Version/10.0.9.2372 Mobile Safari/537.1+',
    },
  }).then(res => res.text());

  const fontUrl = css.match(/src: url\((.+?)\) format\('truetype'\)/)?.[1];

  if (!fontUrl) {
    throw new Error(`Could not find TrueType font URL for ${family}:${weight}`);
  }

  return fetch(fontUrl).then(res => res.arrayBuffer());
}

export async function getOgFonts() {
  const [interRegular, interMedium, frauncesRegular] = await Promise.all([
    fetchGoogleFont('Inter', 400),
    fetchGoogleFont('Inter', 500),
    fetchGoogleFont('Fraunces', 700),
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
