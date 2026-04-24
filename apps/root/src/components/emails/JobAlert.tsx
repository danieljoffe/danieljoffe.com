import { Section, Text, Link, Hr } from '@react-email/components';
import type { CSSProperties } from 'react';
import EmailLayout from './EmailLayout';

interface JobAlertEmailProps {
  title: string;
  company: string;
  location: string | null;
  score: number;
  jobUrl: string;
  fittedUrl: string;
  unsubscribeUrl: string;
}

export default function JobAlertEmail({
  title,
  company,
  location,
  score,
  jobUrl,
  fittedUrl,
  unsubscribeUrl,
}: JobAlertEmailProps) {
  return (
    <EmailLayout
      preview={`${title} at ${company} — score ${score}`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={headline}>New match in Fitted</Text>
      <Text style={paragraph}>A new posting scored above your threshold.</Text>

      <Section style={jobCard}>
        <Text style={scoreBadge}>SCORE {score}</Text>
        <Text style={jobTitle}>{title}</Text>
        <Text style={jobMeta}>
          {company}
          {location ? ` · ${location}` : ''}
        </Text>
      </Section>

      <Hr style={hr} />

      <Section style={ctaSection}>
        <Link href={fittedUrl} style={primaryButton}>
          Open in Fitted
        </Link>
      </Section>

      <Text style={secondaryLinkWrap}>
        <Link href={jobUrl} style={secondaryLink}>
          View original posting →
        </Link>
      </Text>
    </EmailLayout>
  );
}

const headline: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  margin: '0 0 8px',
};

const paragraph: CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 24px',
  color: '#ccc',
};

const jobCard: CSSProperties = {
  backgroundColor: '#141414',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid #2a2a2a',
};

const scoreBadge: CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.5px',
  color: '#63CAA5',
  margin: '0 0 8px',
};

const jobTitle: CSSProperties = {
  fontSize: '18px',
  fontWeight: 600,
  margin: '0 0 8px',
};

const jobMeta: CSSProperties = {
  fontSize: '14px',
  lineHeight: '1.6',
  color: '#999',
  margin: 0,
};

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '24px 0',
};

const ctaSection: CSSProperties = {
  textAlign: 'center',
  padding: '8px 0 16px',
};

const primaryButton: CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#63CAA5',
  color: '#0a0a0a',
  padding: '12px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
};

const secondaryLinkWrap: CSSProperties = {
  textAlign: 'center',
  margin: '0 0 8px',
};

const secondaryLink: CSSProperties = {
  fontSize: '13px',
  color: '#999',
  textDecoration: 'underline',
};
