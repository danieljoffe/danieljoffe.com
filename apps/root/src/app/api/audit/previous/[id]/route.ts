import { NextRequest, NextResponse } from 'next/server';
import { isValidUuid } from '@danieljoffe.com/shared-audit';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';

const PREVIOUS_SCAN_FIELDS = [
  'id',
  'url',
  'normalized_url',
  'device_mode',
  'created_at',
  'completed_at',
  'grade_overall',
  'score_performance',
  'score_accessibility',
  'score_best_practices',
  'score_seo',
].join(', ');

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!isValidUuid(id)) {
      return NextResponse.json({ error: 'Invalid scan ID' }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Service unavailable' },
        { status: 503 }
      );
    }

    const { data: current, error: currentError } = await supabase
      .from('scans')
      .select('id, normalized_url, device_mode, status')
      .eq('id', id)
      .single();

    if (currentError || !current) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (current.status !== 'completed') {
      return NextResponse.json({ previous: null });
    }

    const { data: previous } = await supabase
      .from('scans')
      .select(PREVIOUS_SCAN_FIELDS)
      .eq('normalized_url', current.normalized_url)
      .eq('device_mode', current.device_mode)
      .eq('status', 'completed')
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({ previous: previous ?? null });
  } catch (error) {
    captureApiError(error, '/api/audit/previous/[id]', 'GET', 500);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
