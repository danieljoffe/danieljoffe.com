import { Section, Text, Link, Hr } from '@react-email/components';
import type { CSSProperties } from 'react';
import EmailLayout from './EmailLayout';

interface QuickWinEmailProps {
  name: string | null;
  url: string;
  issue: {
    title: string;
    description: string;
    category: string;
    severity: string;
    fix_difficulty: string;
    impact: string | null;
  };
  reportUrl: string;
  unsubscribeUrl: string;
}

export default function QuickWinEmail({
  name,
  url,
  issue,
  reportUrl,
  unsubscribeUrl,
}: QuickWinEmailProps) {
  return (
    <EmailLayout
      preview={`Quick win for ${url}: ${issue.title}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={greeting}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={paragraph}>
        Here&apos;s a quick win you can implement on <strong>{url}</strong>{' '}
        right now — no complex tooling required.
      </Text>

      {/* Issue card */}
      <Section style={issueCard}>
        <Text style={difficultyBadge}>
          {issue.fix_difficulty.toUpperCase()} FIX
        </Text>
        <Text style={issueTitle}>{issue.title}</Text>
        <Text style={issueDescription}>{issue.description}</Text>

        {issue.impact && (
          <>
            <Hr style={cardHr} />
            <Text style={impactHeading}>Why this matters</Text>
            <Text style={impactText}>{issue.impact}</Text>
          </>
        )}
      </Section>

      <Hr style={hr} />

      {/* CTA */}
      <Section style={ctaSection}>
        <Link href={reportUrl} style={ctaButton}>
          See All Your Issues
        </Link>
      </Section>

      <Text style={closing}>
        I&apos;ll follow up in a few days with some additional insights.
        <br />
        <br />
        Best,
        <br />
        Daniel Joffe
      </Text>
    </EmailLayout>
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

const issueCard: CSSProperties = {
  backgroundColor: '#141414',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid #2a2a2a',
};

const difficultyBadge: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: '#63CAA5',
  margin: '0 0 8px',
};

const issueTitle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  margin: '0 0 8px',
};

const issueDescription: CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#ccc',
  margin: 0,
};

const cardHr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '16px 0',
};

const impactHeading: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#FFB46B',
  margin: '0 0 4px',
};

const impactText: CSSProperties = {
  fontSize: '13px',
  lineHeight: '1.5',
  color: '#999',
  margin: 0,
};

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '24px 0',
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
