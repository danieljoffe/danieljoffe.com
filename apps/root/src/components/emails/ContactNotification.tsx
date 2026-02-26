import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
} from '@react-email/components';
import type { CSSProperties } from 'react';

interface ContactNotificationProps {
  name: string;
  email: string;
  message: string;
}

export default function ContactNotification({
  name,
  email,
  message,
}: ContactNotificationProps) {
  return (
    <Html lang='en'>
      <Head />
      <Preview>New message from {name}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Contact Form Submission</Text>
          </Section>

          <Section style={main}>
            <Text style={label}>From</Text>
            <Text style={value}>
              {name} &lt;
              <Link href={`mailto:${email}`} style={link}>
                {email}
              </Link>
              &gt;
            </Text>

            <Hr style={hr} />

            <Text style={label}>Message</Text>
            <Text style={messageText}>{message}</Text>
          </Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Sent via the contact form at danieljoffe.com
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Inline styles
// ---------------------------------------------------------------------------

const body: CSSProperties = {
  backgroundColor: '#0a0a0a',
  fontFamily:
    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  color: '#e5e5e5',
  margin: 0,
  padding: 0,
};

const container: CSSProperties = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '32px 20px',
};

const header: CSSProperties = {
  paddingBottom: '24px',
};

const brand: CSSProperties = {
  fontSize: '18px',
  fontWeight: 700,
  color: '#63CAA5',
  margin: 0,
};

const main: CSSProperties = {
  padding: '0',
};

const label: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 4px',
};

const value: CSSProperties = {
  fontSize: '16px',
  color: '#e5e5e5',
  margin: '0 0 16px',
};

const link: CSSProperties = {
  color: '#63CAA5',
  textDecoration: 'none',
};

const messageText: CSSProperties = {
  fontSize: '16px',
  color: '#e5e5e5',
  lineHeight: '1.6',
  whiteSpace: 'pre-wrap',
  margin: '0',
};

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '24px 0',
};

const footer: CSSProperties = {
  paddingTop: '0',
};

const footerText: CSSProperties = {
  fontSize: '12px',
  color: '#666',
  margin: 0,
};
