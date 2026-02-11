import { ImageResponse } from 'next/og';
import { getOgFonts, getProfileImageBase64, getUnsplashUrl } from '@/lib/og';
import { experienceRecords } from '@/data/experienceThumbnails';
import { experiencePageSlugs } from '@/data/experience';
import { AllowedExperienceSlugs } from '@/types/base';

export const alt = 'Daniel Joffe - Experience';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return experiencePageSlugs.map(slug => ({ slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const experience = experienceRecords[slug as AllowedExperienceSlugs];

  const [fonts, profileSrc] = await Promise.all([
    getOgFonts(),
    getProfileImageBase64(),
  ]);

  const coverUrl = getUnsplashUrl(experience.cover.src, 600, 630);

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: '#1c1917',
      }}
    >
      {/* Left panel - 60% */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '60%',
          height: '100%',
          padding: '48px 48px 48px 56px',
          background: 'linear-gradient(135deg, #1c1917 0%, #0d7377 100%)',
        }}
      >
        <picture>
          <img
            src={profileSrc}
            alt=''
            width={80}
            height={80}
            style={{
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.2)',
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
          Experience
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '22px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.75)',
            marginTop: '8px',
          }}
        >
          {experience.role}
        </span>

        <span
          style={{
            fontFamily: 'Fraunces',
            fontSize: '48px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.1,
            marginTop: '8px',
          }}
        >
          {experience.title}
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '20px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            marginTop: '16px',
          }}
        >
          {experience.duration}
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '18px',
            fontWeight: 500,
            color: '#5eead4',
            marginTop: '20px',
          }}
        >
          danieljoffe.com
        </span>
      </div>

      {/* Right panel - 40% cover image */}
      <div
        style={{
          display: 'flex',
          width: '40%',
          height: '100%',
        }}
      >
        <picture>
          <img
            src={coverUrl}
            alt=''
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </picture>
      </div>
    </div>,
    {
      ...size,
      fonts,
    }
  );
}
