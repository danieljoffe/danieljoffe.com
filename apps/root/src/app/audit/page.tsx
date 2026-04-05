import type { Metadata } from 'next';
import { PageContainer } from '@danieljoffe.com/shared-ui/PageContainer';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { auditFaqStructuredData } from '@/data/structuredData/audit';
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

async function getCompletedScanCount(): Promise<number> {
  try {
    const supabase = createServerSupabaseClient();
    if (!supabase) return 0;
    const { count } = await supabase
      .from('scans')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');
    return count ?? 0;
  } catch {
    return 0;
  }
}

export default async function AuditPage() {
  const scanCount = await getCompletedScanCount();

  return (
    <PageContainer
      as='main'
      id='main-content'
      className='py-16 lg:py-24 space-y-24'
    >
      <script
        type='application/ld+json'
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(auditFaqStructuredData).replace(
            /</g,
            '\\u003c'
          ),
        }}
      />
      <ScanHero scanCount={scanCount} />
      <HowItWorks />
    </PageContainer>
  );
}
