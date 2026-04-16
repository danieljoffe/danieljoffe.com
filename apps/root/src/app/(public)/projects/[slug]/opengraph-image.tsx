import { ImageResponse } from 'next/og';
import {
  getOgFonts,
  getProfileImageBase64,
  getCoverImageBase64,
} from '@/lib/og';
import { getContentBySlug } from '@/data/contentRegistry';
import { projectPageSlugs } from '@/data/project';

export const alt = 'Daniel Joffe - Project';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return projectPageSlugs.map(slug => ({ slug }));
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const entry = getContentBySlug('project', slug);
  if (!entry) {
    throw new Error(`Project entry not found: ${slug}`);
  }
  const project = entry.metadata;

  const [fonts, profileSrc, coverSrc] = await Promise.all([
    getOgFonts(),
    getProfileImageBase64(),
    getCoverImageBase64(project.cover.src),
  ]);

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
          Project
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '48px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.1,
            marginTop: '8px',
          }}
        >
          {project.title}
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '22px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.75)',
            marginTop: '16px',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {project.excerpt}
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
          background: '#0d7377',
        }}
      >
        {coverSrc && (
          <picture>
            <img
              src={coverSrc}
              alt=''
              width={480}
              height={630}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </picture>
        )}
      </div>
    </div>,
    {
      ...size,
      fonts,
    }
  );
}
