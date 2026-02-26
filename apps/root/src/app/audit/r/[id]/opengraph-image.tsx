import { ImageResponse } from 'next/og';
import { getOgFonts } from '@/lib/og';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { isValidUuid, GRADE_MAP } from '@danieljoffe.com/shared-audit';

export const alt = 'Website Performance Audit Report';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface ScoreBarProps {
  label: string;
  value: number | null;
}

function ScoreBar({ label, value }: ScoreBarProps) {
  const score = value ?? 0;
  const color = score >= 90 ? '#63CAA5' : score >= 50 ? '#FFB46B' : '#FF6B6B';

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '18px',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.75)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'Inter',
          fontSize: '24px',
          fontWeight: 500,
          color: value != null ? color : 'rgba(255,255,255,0.4)',
        }}
      >
        {value != null ? score : '—'}
      </span>
    </div>
  );
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fallback OG image if data fetch fails
  const fallback = async () => {
    const fonts = await getOgFonts();
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
        <span
          style={{
            fontFamily: 'Fraunces',
            fontSize: '52px',
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          Website Audit Report
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '24px',
            fontWeight: 500,
            color: '#5eead4',
            marginTop: '20px',
          }}
        >
          danieljoffe.com/audit
        </span>
      </div>,
      { ...size, fonts }
    );
  };

  // Fetch data inside try/catch, render JSX outside (ESLint react-hooks/error-boundaries)
  interface ScanData {
    url: string;
    page_title: string | null;
    grade_overall: string | null;
    score_performance: number | null;
    score_accessibility: number | null;
    score_seo: number | null;
    score_best_practices: number | null;
  }

  let scan: ScanData | null = null;
  try {
    if (isValidUuid(id)) {
      const supabase = createServerSupabaseClient();
      if (supabase) {
        const { data, error } = await supabase
          .from('scans')
          .select(
            'url, page_title, grade_overall, score_performance, score_accessibility, score_seo, score_best_practices'
          )
          .eq('id', id)
          .eq('status', 'completed')
          .single();

        if (!error && data) {
          scan = data as ScanData;
        }
      }
    }
  } catch {
    // Fall through to fallback
  }

  if (!scan) return fallback();

  const grade = scan.grade_overall ? GRADE_MAP[scan.grade_overall] : null;
  const title = scan.page_title || scan.url;
  const fonts = await getOgFonts();

  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #1c1917 0%, #0d7377 100%)',
      }}
    >
      {/* Left panel — grade + title */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          width: '55%',
          height: '100%',
          padding: '48px 32px 48px 56px',
        }}
      >
        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '14px',
            fontWeight: 500,
            color: '#5eead4',
            textTransform: 'uppercase',
            letterSpacing: '2px',
          }}
        >
          Performance Audit
        </span>

        <span
          style={{
            fontFamily: 'Fraunces',
            fontSize: '40px',
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.2,
            marginTop: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {title.length > 40 ? `${title.slice(0, 40)}...` : title}
        </span>

        <span
          style={{
            fontFamily: 'Inter',
            fontSize: '18px',
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            marginTop: '8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '100%',
          }}
        >
          {scan.url.length > 50 ? `${scan.url.slice(0, 50)}...` : scan.url}
        </span>

        <div
          style={{
            display: 'flex',
            width: '80px',
            height: '2px',
            background: '#0d9488',
            marginTop: '24px',
            marginBottom: '24px',
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
          danieljoffe.com/audit
        </span>
      </div>

      {/* Right panel — grade badge + scores */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '45%',
          height: '100%',
          padding: '48px',
        }}
      >
        {grade && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100px',
                height: '100px',
                borderRadius: '20px',
                backgroundColor: grade.color,
                fontSize: '56px',
                fontFamily: 'Fraunces',
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              {grade.grade}
            </div>
            <span
              style={{
                fontFamily: 'Inter',
                fontSize: '18px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.85)',
                marginTop: '8px',
              }}
            >
              {grade.label}
            </span>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '280px',
          }}
        >
          <ScoreBar label='Performance' value={scan.score_performance} />
          <ScoreBar label='Accessibility' value={scan.score_accessibility} />
          <ScoreBar label='SEO' value={scan.score_seo} />
          <ScoreBar label='Best Practices' value={scan.score_best_practices} />
        </div>
      </div>
    </div>,
    { ...size, fonts }
  );
}
