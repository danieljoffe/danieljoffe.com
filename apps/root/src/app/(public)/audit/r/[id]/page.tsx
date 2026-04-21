import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageLayout } from '@danieljoffe.com/shared-ui/PageLayout';
import {
  isValidUuid,
  GRADE_MAP,
  type Scan,
  type ScanIssue,
  type DeviceMode,
} from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ReportHeader from './ReportHeader';
import ScoreCards from './ScoreCards';
import CoreWebVitals from './CoreWebVitals';
import IssueList from './IssueList';
import CTASection from './CTASection';
import ReportAnalytics from './ReportAnalytics';
import DeviceTabs from './DeviceTabs';
import ScanPending from './ScanPending';
import ScanFailed from './ScanFailed';

interface ReportPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type ScanReport = Pick<
  Scan,
  | 'id'
  | 'url'
  | 'normalized_url'
  | 'status'
  | 'created_at'
  | 'completed_at'
  | 'error_message'
  | 'score_performance'
  | 'score_accessibility'
  | 'score_best_practices'
  | 'score_seo'
  | 'grade_overall'
  | 'fcp_ms'
  | 'lcp_ms'
  | 'tbt_ms'
  | 'cls'
  | 'si_ms'
  | 'page_title'
  | 'page_description'
  | 'page_screenshot_url'
  | 'source'
  | 'device_mode'
  | 'paired_scan_id'
>;

const getScanData = cache(async (id: string) => {
  const supabase = createServerSupabaseClient();
  if (!supabase) return null;

  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select(
      [
        'id, url, normalized_url, status, created_at, completed_at,',
        'error_message, score_performance, score_accessibility, score_best_practices,',
        'score_seo, grade_overall, fcp_ms, lcp_ms, tbt_ms, cls, si_ms,',
        'page_title, page_description, page_screenshot_url, source,',
        'device_mode, paired_scan_id',
      ].join(' ')
    )
    .eq('id', id)
    .single();

  if (scanError || !scan) return null;

  const typedScan = scan as unknown as ScanReport;

  // Only fetch issues for completed scans
  if (typedScan.status !== 'completed') {
    return { scan: typedScan, issues: [] as ScanIssue[] };
  }

  const { data: issues } = await supabase
    .from('scan_issues')
    .select('*')
    .eq('scan_id', id)
    .order('sort_order', { ascending: true });

  return {
    scan: typedScan,
    issues: (issues || []) as ScanIssue[],
  };
});

const noIndexRobots = { index: false, follow: true } as const;

export async function generateMetadata({
  params,
  searchParams,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return { title: 'Report Not Found | Daniel Joffe', robots: noIndexRobots };
  }

  const data = await getScanData(id);

  // Scan not in DB yet — freshly redirected from form
  if (!data) {
    const sp = await searchParams;
    if (sp.url)
      return { title: 'Scanning... | Daniel Joffe', robots: noIndexRobots };
    return { title: 'Report Not Found | Daniel Joffe', robots: noIndexRobots };
  }

  const { scan } = data;

  if (scan.status === 'pending' || scan.status === 'running') {
    return { title: 'Scanning... | Daniel Joffe', robots: noIndexRobots };
  }

  if (scan.status === 'failed') {
    return { title: 'Scan Failed | Daniel Joffe', robots: noIndexRobots };
  }

  const grade = scan.grade_overall as string;
  const gradeInfo = GRADE_MAP[grade];
  const title = scan.page_title || scan.url;

  return {
    title: `Audit: ${title} — Grade ${grade} | Daniel Joffe`,
    description: `This site scored a ${grade} (${gradeInfo?.label}). Performance: ${scan.score_performance}, Accessibility: ${scan.score_accessibility}, SEO: ${scan.score_seo}.`,
    robots: noIndexRobots,
    openGraph: {
      title: `Performance Audit: Grade ${grade}`,
      description: `${title} scored a ${grade}. Get your free audit at danieljoffe.com/audit`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `Performance Audit: Grade ${grade}`,
      description: `${title} scored a ${grade}. Get your free audit at danieljoffe.com/audit`,
    },
  };
}

export default async function ReportPage({
  params,
  searchParams,
}: ReportPageProps) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const data = await getScanData(id);

  // Scan not in DB yet — freshly redirected from form (or race condition).
  // The searchParams carry enough info to render the polling UI.
  if (!data) {
    const sp = await searchParams;
    const urlParam = typeof sp.url === 'string' ? sp.url : undefined;

    if (urlParam) {
      const deviceParam = sp.device === 'desktop' ? 'desktop' : 'mobile';
      const isPaired = sp.device === 'both';
      return (
        <PageLayout>
          <ScanPending
            scanId={id}
            url={urlParam}
            deviceMode={deviceParam as DeviceMode}
            isPaired={isPaired}
          />
        </PageLayout>
      );
    }

    notFound();
  }

  const { scan, issues } = data;
  const deviceMode: DeviceMode =
    scan.device_mode === 'desktop' ? 'desktop' : 'mobile';

  // Scan still in progress — show polling UI
  if (scan.status === 'pending' || scan.status === 'running') {
    return (
      <PageLayout>
        <ScanPending
          scanId={scan.id}
          url={scan.url}
          deviceMode={deviceMode}
          isPaired={scan.paired_scan_id !== null}
        />
      </PageLayout>
    );
  }

  // Scan failed — show friendly error
  if (scan.status === 'failed') {
    return (
      <PageLayout>
        <ScanFailed url={scan.url} errorMessage={scan.error_message} />
      </PageLayout>
    );
  }

  // Completed — render full report
  return (
    <PageLayout>
      <ReportHeader
        scanId={scan.id}
        url={scan.url}
        pageTitle={scan.page_title}
        screenshotUrl={scan.page_screenshot_url}
        gradeOverall={scan.grade_overall}
        completedAt={scan.completed_at}
        deviceMode={deviceMode}
      />
      <DeviceTabs
        currentDevice={deviceMode}
        currentScanId={scan.id}
        pairedScanId={scan.paired_scan_id}
      />
      <ScoreCards
        performance={scan.score_performance}
        accessibility={scan.score_accessibility}
        seo={scan.score_seo}
        bestPractices={scan.score_best_practices}
        deviceMode={deviceMode}
      />
      <CoreWebVitals
        fcpMs={scan.fcp_ms}
        lcpMs={scan.lcp_ms}
        tbtMs={scan.tbt_ms}
        cls={scan.cls}
        siMs={scan.si_ms}
        deviceMode={deviceMode}
      />
      <IssueList issues={issues} />
      <CTASection />
      {scan.grade_overall && (
        <ReportAnalytics scanId={scan.id} grade={scan.grade_overall} />
      )}
    </PageLayout>
  );
}
