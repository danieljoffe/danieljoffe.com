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
import type { CSSProperties, ReactNode } from 'react';

interface EmailLayoutProps {
  preview: string;
  unsubscribeUrl: string;
  children: ReactNode;
}

export default function EmailLayout({
  preview,
  unsubscribeUrl,
  children,
}: EmailLayoutProps) {
  return (
    <Html lang='en'>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>Daniel Joffe</Text>
          </Section>

          <Section style={main}>{children}</Section>

          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              You received this because you used the free website audit tool at
              danieljoffe.com.
            </Text>
            <Link href={unsubscribeUrl} style={unsubscribeLink}>
              Unsubscribe
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Inline styles — email clients strip <style> tags inconsistently
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

const hr: CSSProperties = {
  borderColor: '#2a2a2a',
  margin: '32px 0 16px',
};

const footer: CSSProperties = {
  paddingTop: '0',
};

const footerText: CSSProperties = {
  fontSize: '12px',
  color: '#666',
  margin: '0 0 8px',
};

const unsubscribeLink: CSSProperties = {
  fontSize: '12px',
  color: '#666',
  textDecoration: 'underline',
};
