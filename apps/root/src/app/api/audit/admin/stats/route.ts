import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { verifyAdminAuth } from '../auth';

export async function GET(request: NextRequest) {
  try {
    const authError = verifyAdminAuth(request);
    if (authError) return authError;

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [
      totalScansResult,
      scansToday,
      totalLeadsResult,
      completedScansResult,
    ] = await Promise.all([
      supabase.from('scans').select('id', { count: 'exact', head: true }),
      supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase
        .from('scans')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed'),
    ]);

    const totalScans = totalScansResult.count ?? 0;
    const totalLeads = totalLeadsResult.count ?? 0;
    const completedScans = completedScansResult.count ?? 0;

    const conversionRate =
      completedScans > 0
        ? Math.round((totalLeads / completedScans) * 1000) / 10
        : 0;

    return NextResponse.json({
      totalScans,
      scansToday: scansToday.count ?? 0,
      totalLeads,
      conversionRate,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/audit/admin/stats',
      'GET',
      500
    );
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
