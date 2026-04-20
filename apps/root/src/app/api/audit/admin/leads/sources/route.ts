import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { verifyAdminAuth } from '../../auth';

interface LeadRow {
  source: string | null;
}

export interface LeadSourceEntry {
  source: string;
  count: number;
}

export interface LeadSourcesResponse {
  total: number;
  sources: LeadSourceEntry[];
}

export async function GET() {
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

    const { data, error } = await supabase.from('leads').select('source');

    if (error) {
      captureApiError(
        new Error(error.message),
        '/api/audit/admin/leads/sources',
        'GET',
        500
      );
      return NextResponse.json(
        { error: 'Failed to aggregate lead sources' },
        { status: 500 }
      );
    }

    const rows = (data as LeadRow[] | null) ?? [];
    const counts = new Map<string, number>();
    for (const row of rows) {
      const key = row.source ?? 'unknown';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    const sources: LeadSourceEntry[] = Array.from(counts.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);

    const body: LeadSourcesResponse = {
      total: rows.length,
      sources,
    };

    return NextResponse.json(body);
  } catch (error) {
    captureApiError(error, '/api/audit/admin/leads/sources', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
