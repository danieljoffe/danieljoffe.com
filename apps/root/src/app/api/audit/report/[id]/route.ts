import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isValidUuid, type ScanIssue } from '@danieljoffe.com/shared-audit';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: scan, error: scanError } = await supabase
      .from('scans')
      .select(
        [
          'id, url, normalized_url, status, created_at, completed_at,',
          'error_message, score_performance, score_accessibility, score_best_practices,',
          'score_seo, grade_overall, fcp_ms, lcp_ms, tbt_ms, cls, si_ms,',
          'page_title, page_description, page_screenshot_url, source',
        ].join(' ')
      )
      .eq('id', id)
      .eq('status', 'completed')
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { data: issues } = await supabase
      .from('scan_issues')
      .select('*')
      .eq('scan_id', id)
      .order('sort_order', { ascending: true });

    const issueList = (issues || []) as ScanIssue[];

    const summary = {
      total: issueList.length,
      critical: issueList.filter(i => i.severity === 'critical').length,
      warning: issueList.filter(i => i.severity === 'warning').length,
      info: issueList.filter(i => i.severity === 'info').length,
    };

    return NextResponse.json({
      scan,
      issues: issueList,
      summary,
    });
  } catch (error) {
    captureApiError(error, '/api/audit/report/[id]', 'GET', 500);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
