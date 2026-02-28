import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import MainContent from '@/components/MainContent';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  isValidUuid,
  GRADE_MAP,
  type Scan,
  type ScanIssue,
  type DeviceMode,
} from '@danieljoffe.com/shared-audit';
import ReportHeader from './ReportHeader';
import ScoreCards from './ScoreCards';
import CoreWebVitals from './CoreWebVitals';
import IssueList from './IssueList';
import CTASection from './CTASection';
import ReportAnalytics from './ReportAnalytics';
import DeviceTabs from './DeviceTabs';

interface ReportPageProps {
  params: Promise<{ id: string }>;
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

async function getReportData(id: string) {
  const supabase = createServerSupabaseClient();
  if (!supabase) return notFound();

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
    .eq('status', 'completed')
    .single();

  if (scanError || !scan) return null;

  const { data: issues } = await supabase
    .from('scan_issues')
    .select('*')
    .eq('scan_id', id)
    .order('sort_order', { ascending: true });

  return {
    scan: scan as unknown as ScanReport,
    issues: (issues || []) as ScanIssue[],
  };
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return { title: 'Report Not Found | Daniel Joffe' };
  }

  const data = await getReportData(id);
  if (!data) {
    return { title: 'Report Not Found | Daniel Joffe' };
  }

  const { scan } = data;
  const grade = scan.grade_overall as string;
  const gradeInfo = GRADE_MAP[grade];
  const title = scan.page_title || scan.url;

  return {
    title: `Audit: ${title} — Grade ${grade} | Daniel Joffe`,
    description: `This site scored a ${grade} (${gradeInfo?.label}). Performance: ${scan.score_performance}, Accessibility: ${scan.score_accessibility}, SEO: ${scan.score_seo}.`,
    openGraph: {
      title: `Performance Audit: Grade ${grade}`,
      description: `${title} scored a ${grade}. Get your free audit at danieljoffe.com/audit`,
    },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const data = await getReportData(id);
  if (!data) {
    notFound();
  }

  const { scan, issues } = data;
  const deviceMode: DeviceMode =
    scan.device_mode === 'desktop' ? 'desktop' : 'mobile';

  return (
    <MainContent>
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
      <IssueList issues={issues} scanId={scan.id} />
      <CTASection />
      {scan.grade_overall && (
        <ReportAnalytics scanId={scan.id} grade={scan.grade_overall} />
      )}
    </MainContent>
  );
}
