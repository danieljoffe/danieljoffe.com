import { Section, Text, Link, Hr } from '@react-email/components';
import type { CSSProperties } from 'react';
import EmailLayout from './EmailLayout';

interface TopIssue {
  title: string;
  severity: string;
  category: string;
}

export interface FullReportEmailProps {
  name: string | null;
  url: string;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  scores: {
    performance: number | null;
    accessibility: number | null;
    seo: number | null;
    bestPractices: number | null;
  };
  topIssues: TopIssue[];
  reportUrl: string;
  unsubscribeUrl: string;
}

export default function FullReportEmail({
  name,
  url,
  grade,
  gradeLabel,
  gradeColor,
  scores,
  topIssues,
  reportUrl,
  unsubscribeUrl,
}: FullReportEmailProps) {
  return (
    <EmailLayout
      preview={`Your website scored a ${grade} (${gradeLabel})`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={greeting}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={paragraph}>
        Your performance audit for <strong>{url}</strong> is ready.
      </Text>

      {/* Grade badge */}
      <Section style={gradeSection}>
        <Text
          style={{
            ...gradeBadge,
            backgroundColor: gradeColor,
          }}
        >
          {grade}
        </Text>
        <Text style={gradeText}>{gradeLabel}</Text>
      </Section>

      {/* Score summary */}
      <Section style={scoresSection}>
        <ScoreItem label='Performance' value={scores.performance} />
        <ScoreItem label='Accessibility' value={scores.accessibility} />
        <ScoreItem label='SEO' value={scores.seo} />
        <ScoreItem label='Best Practices' value={scores.bestPractices} />
      </Section>

      {/* Top issues */}
      {topIssues.length > 0 && (
        <>
          <Hr style={hr} />
          <Text style={sectionHeading}>Top Issues Found</Text>
          {topIssues.map((issue, i) => (
            <Section key={i} style={issueRow}>
              <Text style={issueSeverity}>
                {issue.severity === 'critical' ? '!' : '-'}{' '}
                {issue.severity.toUpperCase()}
              </Text>
              <Text style={issueTitle}>{issue.title}</Text>
              <Text style={issueCategory}>{issue.category}</Text>
            </Section>
          ))}
        </>
      )}

      <Hr style={hr} />

      {/* CTA */}
      <Section style={ctaSection}>
        <Link href={reportUrl} style={ctaButton}>
          View Full Report
        </Link>
      </Section>

      <Text style={closing}>
        Best regards,
        <br />
        Daniel Joffe
      </Text>
    </EmailLayout>
  );
}

function ScoreItem({ label, value }: { label: string; value: number | null }) {
  return (
    <Text style={scoreItem}>
      <span style={scoreLabel}>{label}</span>
      <span style={scoreValue}>{value ?? '—'}</span>
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const greeting: CSSProperties = {
  fontSize: '16px',
  margin: '0 0 12px',
};

const paragraph: CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
  color: '#ccc',
};

const gradeSection: CSSProperties = {
  textAlign: 'center',
  padding: '24px 0',
};

const gradeBadge: CSSProperties = {
  display: 'inline-block',
  width: '64px',
  height: '64px',
  lineHeight: '64px',
  borderRadius: '16px',
  fontSize: '32px',
  fontWeight: 700,
  color: '#fff',
  textAlign: 'center',
  margin: '0 auto 8px',
};

const gradeText: CSSProperties = {
  fontSize: '14px',
  color: '#999',
  margin: 0,
};

const scoresSection: CSSProperties = {
  padding: '16px',
  backgroundColor: '#141414',
  borderRadius: '8px',
};

const scoreItem: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '14px',
  margin: '4px 0',
};

const scoreLabel: CSSProperties = {
  color: '#999',
};

const scoreValue: CSSProperties = {
  color: '#e5e5e5',
  fontWeight: 600,
};

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '24px 0',
};

const sectionHeading: CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  margin: '0 0 12px',
};

const issueRow: CSSProperties = {
  padding: '8px 0',
};

const issueSeverity: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: '#FF8CA0',
  margin: '0 0 2px',
};

const issueTitle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 500,
  margin: '0 0 2px',
};

const issueCategory: CSSProperties = {
  fontSize: '12px',
  color: '#666',
  margin: 0,
  textTransform: 'capitalize',
};

const ctaSection: CSSProperties = {
  textAlign: 'center',
  padding: '8px 0 24px',
};

const ctaButton: CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#63CAA5',
  color: '#0a0a0a',
  padding: '12px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
};

const closing: CSSProperties = {
  fontSize: '14px',
  color: '#999',
  lineHeight: '1.6',
};
