import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import {
  isValidUuid,
  type ScanIssue,
  type DeviceMode,
} from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  COMPARE_SCAN_FIELDS,
  COMPARE_SCAN_ISSUE_FIELDS,
  type CompareScan,
} from '@/lib/compareScanFields';
import ComparisonHeader from './ComparisonHeader';
import ScoreDeltaCards from './ScoreDeltaCards';
import CoreWebVitalsDelta from './CoreWebVitalsDelta';
import IssueDiff from './IssueDiff';

export const revalidate = 300;

interface CompareSearchParams {
  auditA?: string;
  auditB?: string;
}

interface ComparePageProps {
  searchParams: Promise<CompareSearchParams>;
}

interface CompareData {
  scanA: CompareScan;
  scanB: CompareScan;
  issuesA: ScanIssue[];
  issuesB: ScanIssue[];
}

async function getCompareData(
  auditA: string,
  auditB: string
): Promise<CompareData | null> {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const [scansRes, issuesRes] = await Promise.all([
    supabase
      .from('scans')
      .select(COMPARE_SCAN_FIELDS)
      .in('id', [auditA, auditB])
      .eq('status', 'completed'),
    supabase
      .from('scan_issues')
      .select(COMPARE_SCAN_ISSUE_FIELDS)
      .in('scan_id', [auditA, auditB])
      .order('sort_order', { ascending: true }),
  ]);

  const { data: scans, error } = scansRes;
  if (error || !scans || scans.length !== 2) return null;

  const typed = scans as unknown as CompareScan[];
  const scanA = typed.find(s => s.id === auditA);
  const scanB = typed.find(s => s.id === auditB);
  if (!scanA || !scanB) return null;

  if (scanA.normalized_url !== scanB.normalized_url) return null;

  const allIssues = (issuesRes.data ?? []) as ScanIssue[];

  return {
    scanA,
    scanB,
    issuesA: allIssues.filter(i => i.scan_id === auditA),
    issuesB: allIssues.filter(i => i.scan_id === auditB),
  };
}

const noIndexRobots = { index: false, follow: true } as const;

export async function generateMetadata({
  searchParams,
}: ComparePageProps): Promise<Metadata> {
  const sp = await searchParams;
  const { auditA, auditB } = sp;

  if (
    !auditA ||
    !auditB ||
    !isValidUuid(auditA) ||
    !isValidUuid(auditB) ||
    auditA === auditB
  ) {
    return {
      title: 'Comparison Not Found | Daniel Joffe',
      robots: noIndexRobots,
    };
  }

  const data = await getCompareData(auditA, auditB);
  if (!data) {
    return {
      title: 'Comparison Not Found | Daniel Joffe',
      robots: noIndexRobots,
    };
  }

  return {
    title: `Audit Comparison: ${data.scanB.url} | Daniel Joffe`,
    description: `Comparing two audits for ${data.scanB.url}.`,
    robots: noIndexRobots,
  };
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const sp = await searchParams;
  const { auditA, auditB } = sp;

  if (
    !auditA ||
    !auditB ||
    !isValidUuid(auditA) ||
    !isValidUuid(auditB) ||
    auditA === auditB
  ) {
    notFound();
  }

  const data = await getCompareData(auditA, auditB);
  if (!data) notFound();

  const { scanA, scanB, issuesA, issuesB } = data;
  const deviceMode: DeviceMode =
    scanB.device_mode === 'desktop' ? 'desktop' : 'mobile';

  return (
    <PageLayout>
      <ComparisonHeader scanA={scanA} scanB={scanB} deviceMode={deviceMode} />
      <ScoreDeltaCards scanA={scanA} scanB={scanB} />
      <CoreWebVitalsDelta scanA={scanA} scanB={scanB} />
      <IssueDiff issuesA={issuesA} issuesB={issuesB} />
    </PageLayout>
  );
}
