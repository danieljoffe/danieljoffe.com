import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { verifyAdminAuth } from '../auth';

const ALLOWED_SORT_COLUMNS = [
  'created_at',
  'email',
  'source',
  'email_sequence_step',
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
      data: leads,
      error,
      count,
    } = await supabase
      .from('leads')
      .select(
        'id, email, name, company, url_scanned, source, created_at, email_sequence_step',
        { count: 'exact' }
      )
      .order(sort, { ascending: order })
      .range(from, to);

    if (error) {
      captureApiError(
        new Error(error.message),
        '/api/audit/admin/leads',
        'GET',
        500
      );
      return NextResponse.json(
        { error: 'Failed to fetch leads' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      leads: leads ?? [],
      total: count ?? 0,
      page,
      pageSize,
    });
  } catch (error) {
    captureApiError(error, '/api/audit/admin/leads', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
