import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isSameOrigin } from '../sameOrigin';
import { checkInsightsRateLimit, extractClientIp } from '../rateLimit';

// No `revalidate` export: reading request headers opts the route into
// dynamic rendering. CDN caching still applies via Cache-Control below.

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

interface DomainRow {
  domain: string;
  scan_count: number;
  latest_grade: string | null;
  latest_scan_at: string | null;
}

function parseLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT;
  const n = Number.parseInt(raw, 10);
  if (Number.isNaN(n) || n < 1) return DEFAULT_LIMIT;
  return Math.min(n, MAX_LIMIT);
}

export async function GET(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const rate = checkInsightsRateLimit(extractClientIp(request));
    if (rate.blocked) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSeconds) },
        }
      );
    }

    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get('limit'));

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('insights_domains_view')
      .select('domain, scan_count, latest_grade, latest_scan_at')
      .order('scan_count', { ascending: false })
      .order('domain', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    const domains = ((data as DomainRow[] | null) ?? []).map(row => ({
      domain: row.domain,
      scanCount: row.scan_count,
      latestGrade: row.latest_grade,
      latestScanAt: row.latest_scan_at,
    }));

    return NextResponse.json(
      { limit, domains },
      {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/insights/domains', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
