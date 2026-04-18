import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import {
  isValidUuid,
  type Scan,
  type ScanIssue,
  type DeviceMode,
} from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ComparisonHeader from './ComparisonHeader';
import ScoreDeltaCards from './ScoreDeltaCards';
import CoreWebVitalsDelta from './CoreWebVitalsDelta';
import IssueDiff from './IssueDiff';

interface CompareSearchParams {
  auditA?: string;
  auditB?: string;
}

interface ComparePageProps {
  searchParams: Promise<CompareSearchParams>;
}

type CompareScan = Pick<
  Scan,
  | 'id'
  | 'url'
  | 'normalized_url'
  | 'status'
  | 'created_at'
  | 'completed_at'
  | 'device_mode'
  | 'grade_overall'
  | 'score_performance'
  | 'score_accessibility'
  | 'score_best_practices'
  | 'score_seo'
  | 'fcp_ms'
  | 'lcp_ms'
  | 'tbt_ms'
  | 'cls'
  | 'si_ms'
  | 'page_title'
  | 'page_screenshot_url'
>;

const COMPARE_SCAN_FIELDS = [
  'id, url, normalized_url, status, created_at, completed_at,',
  'device_mode, grade_overall, score_performance, score_accessibility,',
  'score_best_practices, score_seo, fcp_ms, lcp_ms, tbt_ms, cls, si_ms,',
  'page_title, page_screenshot_url',
].join(' ');

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

  const { data: scans, error } = await supabase
    .from('scans')
    .select(COMPARE_SCAN_FIELDS)
    .in('id', [auditA, auditB])
    .eq('status', 'completed');

  if (error || !scans || scans.length !== 2) return null;

  const typed = scans as unknown as CompareScan[];
  const scanA = typed.find(s => s.id === auditA);
  const scanB = typed.find(s => s.id === auditB);
  if (!scanA || !scanB) return null;

  if (scanA.normalized_url !== scanB.normalized_url) return null;

  const { data: issues } = await supabase
    .from('scan_issues')
    .select('*')
    .in('scan_id', [auditA, auditB])
    .order('sort_order', { ascending: true });

  const allIssues = (issues ?? []) as ScanIssue[];

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
