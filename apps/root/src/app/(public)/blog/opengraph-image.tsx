import { ImageResponse } from 'next/og';
import { getOgFonts, getProfileImageBase64 } from '@/lib/og';

export const alt = 'Daniel Joffe - Blog';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OgImage() {
  const [fonts, profileSrc] = await Promise.all([
    getOgFonts(),
    getProfileImageBase64(),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1c1917 0%, #0d7377 100%)',
        padding: '60px',
      }}
    >
      <picture>
        <img
          src={profileSrc}
          alt=''
          width={120}
          height={120}
          style={{
            borderRadius: '50%',
            border: '4px solid rgba(255,255,255,0.2)',
          }}
        />
      </picture>

      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '14px',
          fontWeight: 500,
          color: '#5eead4',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          marginTop: '24px',
        }}
      >
        Blog
      </span>

      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '56px',
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: 1.1,
          marginTop: '8px',
          textAlign: 'center',
        }}
      >
        Notes from Shipping Code
      </span>

      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '22px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.75)',
          marginTop: '16px',
          textAlign: 'center',
          maxWidth: '800px',
        }}
      >
        Deep-dives on the problems I&apos;ve debugged, the patterns I&apos;ve
        extracted, and the decisions I&apos;d make differently next time
      </span>

      <div
        style={{
          display: 'flex',
          width: '120px',
          height: '2px',
          background: '#0d9488',
          marginTop: '28px',
          marginBottom: '28px',
        }}
      />

      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '18px',
          fontWeight: 500,
          color: '#5eead4',
        }}
      >
        danieljoffe.com
      </span>
    </div>,
    {
      ...size,
      fonts,
    }
  );
}
