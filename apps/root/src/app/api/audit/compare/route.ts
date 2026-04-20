import { NextRequest, NextResponse } from 'next/server';
import {
  isValidUuid,
  type Scan,
  type ScanIssue,
} from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';

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
  'id',
  'url',
  'normalized_url',
  'status',
  'created_at',
  'completed_at',
  'device_mode',
  'grade_overall',
  'score_performance',
  'score_accessibility',
  'score_best_practices',
  'score_seo',
  'fcp_ms',
  'lcp_ms',
  'tbt_ms',
  'cls',
  'si_ms',
  'page_title',
  'page_screenshot_url',
].join(', ');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auditA = searchParams.get('auditA');
    const auditB = searchParams.get('auditB');

    if (!auditA || !auditB) {
      return NextResponse.json(
        { error: 'auditA and auditB query params are required' },
        { status: 400 }
      );
    }

    if (!isValidUuid(auditA) || !isValidUuid(auditB)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    if (auditA === auditB) {
      return NextResponse.json(
        { error: 'auditA and auditB must differ' },
        { status: 400 }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: scans, error: scansError } = await supabase
      .from('scans')
      .select(COMPARE_SCAN_FIELDS)
      .in('id', [auditA, auditB])
      .eq('status', 'completed');

    if (scansError) {
      throw scansError;
    }

    if (!scans || scans.length !== 2) {
      return NextResponse.json(
        { error: 'One or both scans were not found' },
        { status: 404 }
      );
    }

    const typedScans = scans as unknown as CompareScan[];
    const scanA = typedScans.find(s => s.id === auditA);
    const scanB = typedScans.find(s => s.id === auditB);

    if (!scanA || !scanB) {
      return NextResponse.json(
        { error: 'One or both scans were not found' },
        { status: 404 }
      );
    }

    if (scanA.normalized_url !== scanB.normalized_url) {
      return NextResponse.json(
        { error: 'Scans must share the same normalized URL' },
        { status: 400 }
      );
    }

    const { data: issues, error: issuesError } = await supabase
      .from('scan_issues')
      .select('*')
      .in('scan_id', [auditA, auditB]);

    if (issuesError) {
      throw issuesError;
    }

    const allIssues = (issues ?? []) as ScanIssue[];
    const issuesA = allIssues.filter(i => i.scan_id === auditA);
    const issuesB = allIssues.filter(i => i.scan_id === auditB);

    return NextResponse.json({
      scanA,
      scanB,
      issuesA,
      issuesB,
    });
  } catch (error) {
    captureApiError(error, '/api/audit/compare', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
