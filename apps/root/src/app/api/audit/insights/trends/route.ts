import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isSameOrigin } from '../sameOrigin';
import { checkInsightsRateLimit, extractClientIp } from '../rateLimit';

// No `revalidate` export: reading request headers opts the route into
// dynamic rendering. CDN caching still applies via Cache-Control below.

const INTERVAL_MAP: Record<string, 'week' | 'month'> = {
  weekly: 'week',
  monthly: 'month',
};

const PERIOD_MAP: Record<string, number> = {
  '3m': 3,
  '6m': 6,
  '12m': 12,
};

interface TrendRow {
  bucket_start: string;
  avg_overall: number | string | null;
  scan_count: number;
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
    const rawInterval = url.searchParams.get('interval') ?? 'weekly';
    const rawPeriod = url.searchParams.get('period') ?? '6m';

    const bucketInterval = INTERVAL_MAP[rawInterval];
    if (!bucketInterval) {
      return NextResponse.json({ error: 'Invalid interval' }, { status: 400 });
    }

    const periodMonths = PERIOD_MAP[rawPeriod];
    if (periodMonths === undefined) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.rpc('insights_trends', {
      bucket_interval: bucketInterval,
      period_months: periodMonths,
    });

    if (error) {
      throw new Error(error.message);
    }

    const series = ((data as TrendRow[] | null) ?? []).map(row => ({
      bucketStart: row.bucket_start,
      avgOverall: row.avg_overall == null ? null : Number(row.avg_overall),
      scanCount: row.scan_count,
    }));

    return NextResponse.json(
      {
        interval: rawInterval,
        period: rawPeriod,
        series,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=86400, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/insights/trends', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
