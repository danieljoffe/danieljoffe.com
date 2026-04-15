import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { verifyAdminAuth } from '../auth';

const ALLOWED_SORT_COLUMNS = [
  'created_at',
  'url',
  'status',
  'grade_overall',
  'score_performance',
] as const;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function GET(request: NextRequest) {
  try {
    const authError = await verifyAdminAuth();
    if (authError) return authError;

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(
        1,
        parseInt(searchParams.get('pageSize') ?? String(DEFAULT_PAGE_SIZE), 10)
      )
    );
    const sortParam = searchParams.get('sort') ?? 'created_at';
    const sort = ALLOWED_SORT_COLUMNS.includes(
      sortParam as (typeof ALLOWED_SORT_COLUMNS)[number]
    )
      ? sortParam
      : 'created_at';
    const order = searchParams.get('order') === 'asc' ? true : false;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const {
      data: scans,
      error,
      count,
    } = await supabase
      .from('scans')
      .select(
        'id, url, status, grade_overall, created_at, score_performance, score_accessibility, score_seo, score_best_practices',
        { count: 'exact' }
      )
      .order(sort, { ascending: order })
      .range(from, to);

    if (error) {
      captureApiError(
        new Error(error.message),
        '/api/audit/admin/scans',
        'GET',
        500
      );
      return NextResponse.json(
        { error: 'Failed to fetch scans' },
        { status: 500 }
      );
    }

    // Check which scans have leads
    const scanIds = (scans ?? []).map(s => s.id);
    const leadsMap: Record<string, boolean> = {};

    if (scanIds.length > 0) {
      const { data: leadsData } = await supabase
        .from('leads')
        .select('scan_id')
        .in('scan_id', scanIds);

      if (leadsData) {
        for (const lead of leadsData) {
          if (lead.scan_id) {
            leadsMap[lead.scan_id] = true;
          }
        }
      }
    }

    const scansWithLeads = (scans ?? []).map(scan => ({
      ...scan,
      has_lead: leadsMap[scan.id] ?? false,
    }));

    return NextResponse.json({
      scans: scansWithLeads,
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    captureApiError(error, '/api/audit/admin/scans', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
