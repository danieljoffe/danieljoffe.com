import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isSameOrigin } from '../sameOrigin';
import { checkInsightsRateLimit } from '../rateLimit';

export const revalidate = 3600;

interface SummaryRow {
  total_scans: number | null;
  unique_domains: number | null;
  avg_overall_score: number | string | null;
  top_violation: string | null;
}

export async function GET(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const rate = checkInsightsRateLimit(ip);
    if (rate.blocked) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSeconds) },
        }
      );
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase
      .from('insights_summary_view')
      .select('total_scans, unique_domains, avg_overall_score, top_violation')
      .single<SummaryRow>();

    if (error) {
      throw new Error(error.message);
    }

    const avgRaw = data?.avg_overall_score;
    const avgOverallScore = avgRaw == null ? null : Number(avgRaw);

    return NextResponse.json(
      {
        totalScans: data?.total_scans ?? 0,
        uniqueDomains: data?.unique_domains ?? 0,
        avgOverallScore,
        topViolation: data?.top_violation ?? null,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/insights/summary', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
