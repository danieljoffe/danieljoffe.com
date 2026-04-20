import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isSameOrigin } from '../sameOrigin';
import { checkInsightsRateLimit, extractClientIp } from '../rateLimit';

export const revalidate = 3600;

const VALID_CATEGORIES = ['performance', 'accessibility', 'seo', 'ux'] as const;
type Category = (typeof VALID_CATEGORIES)[number];

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

interface ViolationRow {
  category: Category;
  title: string;
  occurrence_count: number;
  severity_critical: number;
  severity_warning: number;
  severity_info: number;
}

function parseCategory(raw: string | null): Category | null {
  if (!raw || raw === 'all') return null;
  return (VALID_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as Category)
    : null;
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
    const rawCategory = url.searchParams.get('category');
    if (rawCategory && rawCategory !== 'all' && !parseCategory(rawCategory)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    const category = parseCategory(rawCategory);
    const limit = parseLimit(url.searchParams.get('limit'));

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const baseQuery = supabase
      .from('insights_violations_view')
      .select(
        'category, title, occurrence_count, severity_critical, severity_warning, severity_info'
      );
    const filtered = category ? baseQuery.eq('category', category) : baseQuery;
    const { data, error } = await filtered
      .order('occurrence_count', { ascending: false })
      .order('title', { ascending: true })
      .limit(limit);
    if (error) {
      throw new Error(error.message);
    }

    const violations = ((data as ViolationRow[] | null) ?? []).map(row => ({
      category: row.category,
      title: row.title,
      occurrenceCount: row.occurrence_count,
      severity: {
        critical: row.severity_critical,
        warning: row.severity_warning,
        info: row.severity_info,
      },
    }));

    return NextResponse.json(
      { category: category ?? 'all', limit, violations },
      {
        headers: {
          'Cache-Control':
            'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error) {
    captureApiError(error, '/api/audit/insights/violations', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
