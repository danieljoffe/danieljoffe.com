import {
  ACCENT_HEX,
  PRESET_PREVIEW,
  type ResumeStyleAccent,
  type ResumeStylePreset,
} from './resumeStyle';

interface ResumeStylePreviewProps {
  preset: ResumeStylePreset;
  accent: ResumeStyleAccent;
}

/**
 * Approximate, instant preview of how the chosen preset + accent will look on
 * the exported .docx. Rendered with inline styles (a literal "sheet of paper"
 * sample), so it intentionally bypasses the Tailwind theme — same rationale as
 * the docx itself, which is not theme-aware. ~80% faithful, no backend call.
 *
 * Decorative only: uses divs, not heading components, so screen readers see one
 * labelled sample region rather than a fake document outline.
 */
export function ResumeStylePreview({
  preset,
  accent,
}: ResumeStylePreviewProps) {
  const p = PRESET_PREVIEW[preset];
  const color = ACCENT_HEX[accent];
  // pt → px (CSS px ≈ pt × 96/72).
  const px = (pt: number) => `${(pt * (96 / 72)).toFixed(1)}px`;

  return (
    <div
      role='img'
      aria-label={`Resume style preview: ${preset} preset, ${accent} accent`}
      className='rounded-md p-4'
      style={{
        background: '#ffffff',
        border: '1px solid #e5e7eb',
        color: '#1a1a1a',
        fontFamily: p.fontFamily,
        lineHeight: p.lineHeight,
      }}
    >
      <div style={{ fontSize: px(p.namePt), color, fontWeight: 700 }}>
        Name LastName
      </div>
      <div style={{ fontSize: px(p.bodyPt), color: '#555555' }}>
        Remote, USA · user@example.com
      </div>
      <div
        style={{
          fontSize: px(p.headingPt),
          color,
          fontWeight: 700,
          marginTop: '10px',
        }}
      >
        Experience
      </div>
      <div style={{ fontSize: px(p.bodyPt), fontWeight: 600 }}>
        Senior Frontend Engineer, Acme · 2022–Present
      </div>
      <div style={{ fontSize: px(p.bodyPt) }}>
        • Led the migration to Next.js and mentored four engineers.
      </div>
    </div>
  );
}
