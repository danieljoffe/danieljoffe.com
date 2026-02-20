import type { Metadata } from 'next';
import MainContent from '@/components/MainContent';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ScanHero from './ScanHero';
import HowItWorks from './HowItWorks';

export const metadata: Metadata = {
  title: 'Free Website Performance Audit | Daniel Joffe',
  description:
    'Paste your URL. Get a detailed performance, accessibility, and SEO report in 30 seconds. Free, no signup required.',
  openGraph: {
    title: 'Free Website Performance Audit',
    description:
      'Get a detailed performance, accessibility, and SEO report in 30 seconds.',
  },
};

async function getCompletedScanCount(): Promise<number> {
  try {
    const supabase = createServerSupabaseClient();
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
    <MainContent>
      <ScanHero scanCount={scanCount} />
      <HowItWorks />
    </MainContent>
  );
}
