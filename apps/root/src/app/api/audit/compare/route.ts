import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid, type ScanIssue } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import {
  COMPARE_SCAN_FIELDS,
  COMPARE_SCAN_ISSUE_FIELDS,
  type CompareScan,
} from '@/lib/compareScanFields';

const CACHE_HEADERS = {
  'Cache-Control':
    'public, max-age=300, s-maxage=86400, stale-while-revalidate=3600',
} as const;

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

    if (scansRes.error) throw scansRes.error;
    if (issuesRes.error) throw issuesRes.error;

    const scans = scansRes.data;
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

    const allIssues = (issuesRes.data ?? []) as ScanIssue[];
    const issuesA = allIssues.filter(i => i.scan_id === auditA);
    const issuesB = allIssues.filter(i => i.scan_id === auditB);

    return NextResponse.json(
      { scanA, scanB, issuesA, issuesB },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/compare', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
