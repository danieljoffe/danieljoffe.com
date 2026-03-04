import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';
import { isValidUuid } from '@danieljoffe.com/shared-audit';

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

    const { data: scan, error } = await supabase
      .from('scans')
      .select(
        'id, status, error_message, grade_overall, device_mode, paired_scan_id'
      )
      .eq('id', id)
      .single();

    if (error || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    // If this scan has a paired scan, include its status
    let paired_status: string | null = null;
    if (scan.paired_scan_id) {
      const { data: paired } = await supabase
        .from('scans')
        .select('status')
        .eq('id', scan.paired_scan_id)
        .single();
      paired_status = paired?.status ?? null;
    }

    return NextResponse.json({
      id: scan.id,
      status: scan.status,
      error_message: scan.error_message,
      grade: scan.grade_overall,
      device_mode: scan.device_mode,
      paired_scan_id: scan.paired_scan_id,
      paired_status,
    });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/audit/status/[id]',
      'GET',
      500
    );

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
