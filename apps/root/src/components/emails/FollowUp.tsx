import { Section, Text, Link, Hr } from '@react-email/components';
import type { CSSProperties } from 'react';
import EmailLayout from './EmailLayout';

interface FollowUpEmailProps {
  name: string | null;
  url: string;
  grade: string;
  gradeLabel: string;
  gradeColor: string;
  reportUrl: string;
  calendlyUrl: string;
  unsubscribeUrl: string;
}

export default function FollowUpEmail({
  name,
  url,
  grade,
  gradeLabel,
  gradeColor,
  reportUrl,
  calendlyUrl,
  unsubscribeUrl,
}: FollowUpEmailProps) {
  return (
    <EmailLayout
      preview={`Your website still scores a ${grade} — let's fix that`}
      unsubscribeUrl={unsubscribeUrl}
    >
      <Text style={greeting}>Hi{name ? ` ${name}` : ''},</Text>
      <Text style={paragraph}>
        A week ago I sent you a quick fix for <strong>{url}</strong>. Your site
        still scores a{' '}
        <span style={{ color: gradeColor, fontWeight: 700 }}>
          {grade} ({gradeLabel})
        </span>
        .
      </Text>

      <Text style={paragraph}>
        I specialize in exactly these kinds of problems — turning slow,
        inaccessible sites into fast, polished experiences. If you&apos;d like
        help tackling the issues in your report, I&apos;d love to chat.
      </Text>

      {/* Primary CTA */}
      <Section style={ctaSection}>
        <Link href={calendlyUrl} style={ctaButton}>
          Book a Free Discovery Call
        </Link>
      </Section>

      <Hr style={hr} />

      {/* Secondary link */}
      <Text style={secondary}>
        Or{' '}
        <Link href={reportUrl} style={secondaryLink}>
          review your full report
        </Link>{' '}
        again.
      </Text>

      <Text style={closing}>
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
  margin: '0 0 16px',
  color: '#ccc',
};

const ctaSection: CSSProperties = {
  textAlign: 'center',
  padding: '16px 0 24px',
};

const ctaButton: CSSProperties = {
  display: 'inline-block',
  backgroundColor: '#63CAA5',
  color: '#0a0a0a',
  padding: '14px 36px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
};

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '24px 0',
};

const secondary: CSSProperties = {
  fontSize: '14px',
  color: '#999',
  margin: '0 0 24px',
};

const secondaryLink: CSSProperties = {
  color: '#63CAA5',
  textDecoration: 'underline',
};

const closing: CSSProperties = {
  fontSize: '14px',
  color: '#999',
  lineHeight: '1.6',
};
