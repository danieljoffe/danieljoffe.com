import type { Metadata } from 'next';
import { PageLayout } from '@danieljoffe/shared-ui/PageLayout';
import { auditFaqStructuredData } from '@/data/structuredData/audit';
import { getOrigin } from '@/lib/getOrigin';
import type { SummaryData } from './insights/types';
import { getViolationSlug } from './insights/violations/data';
import ScanHero from './ScanHero';
import HowItWorks from './HowItWorks';

export const metadata: Metadata = {
  title: 'Free Website Performance Audit | Daniel Joffe',
  description:
    'Paste your URL. Get a detailed performance, accessibility, and SEO report in 30 seconds. Free, no signup required.',
  alternates: {
    canonical: '/audit',
  },
  openGraph: {
    title: 'Free Website Performance Audit',
    description:
      'Get a detailed performance, accessibility, and SEO report in 30 seconds.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Free Website Performance Audit',
    description:
      'Get a detailed performance, accessibility, and SEO report in 30 seconds.',
  },
};

async function getSummary(origin: string): Promise<SummaryData | null> {
  try {
    const res = await fetch(`${origin}/api/audit/insights/summary`, {
      headers: { origin },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<SummaryData>;
  } catch {
    return null;
  }
}

export default async function AuditPage() {
  const origin = await getOrigin();

  const summary = await getSummary(origin);

  return (
    <PageLayout>
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(auditFaqStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
      <ScanHero
        scanCount={summary?.totalScans ?? 0}
        avgScore={summary?.avgOverallScore ?? null}
        topViolation={summary?.topViolation ?? null}
        topViolationSlug={
          summary?.topViolation ? getViolationSlug(summary.topViolation) : null
        }
      />
      <HowItWorks />
    </PageLayout>
  );
}
