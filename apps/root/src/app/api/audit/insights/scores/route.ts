import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isSameOrigin } from '../sameOrigin';
import { checkInsightsRateLimit } from '../rateLimit';

export const revalidate = 3600;

const VALID_PERIODS = new Set(['30', '90']);

interface ScoreStatsRow {
  avg_performance: number | string | null;
  avg_accessibility: number | string | null;
  avg_best_practices: number | string | null;
  avg_seo: number | string | null;
  avg_overall: number | string | null;
  grade_a: number;
  grade_b: number;
  grade_c: number;
  grade_d: number;
  grade_f: number;
  total: number;
}

function toNumber(value: number | string | null): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isNaN(n) ? null : n;
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

    const url = new URL(request.url);
    const rawPeriod = url.searchParams.get('period');
    if (rawPeriod && !VALID_PERIODS.has(rawPeriod)) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 });
    }
    const periodDays = rawPeriod ? Number.parseInt(rawPeriod, 10) : null;

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data, error } = await supabase.rpc('insights_score_stats', {
      period_days: periodDays,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = (data as ScoreStatsRow[] | null)?.[0] ?? null;

    return NextResponse.json(
      {
        period: periodDays,
        averages: {
          performance: toNumber(row?.avg_performance ?? null),
          accessibility: toNumber(row?.avg_accessibility ?? null),
          bestPractices: toNumber(row?.avg_best_practices ?? null),
          seo: toNumber(row?.avg_seo ?? null),
          overall: toNumber(row?.avg_overall ?? null),
        },
        gradeDistribution: {
          A: row?.grade_a ?? 0,
          B: row?.grade_b ?? 0,
          C: row?.grade_c ?? 0,
          D: row?.grade_d ?? 0,
          F: row?.grade_f ?? 0,
        },
        total: row?.total ?? 0,
      },
      {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/insights/scores', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
