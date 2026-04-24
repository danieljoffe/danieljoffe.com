import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/adminSession';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { captureApiError } from '@/lib/errorTracking';

interface PreferencesBody {
  email: string;
  jobScoreThreshold: number;
  jobNotificationsEnabled: boolean;
}

interface PreferencesRow {
  id: string;
  email: string;
  job_score_threshold: number;
  job_notifications_enabled: boolean;
  unsubscribed_at: string | null;
  updated_at: string;
}

function isValidBody(body: unknown): body is PreferencesBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  if (typeof b['email'] !== 'string' || !b['email'].includes('@')) return false;
  if (
    typeof b['jobScoreThreshold'] !== 'number' ||
    !Number.isInteger(b['jobScoreThreshold']) ||
    b['jobScoreThreshold'] < 0 ||
    b['jobScoreThreshold'] > 100
  ) {
    return false;
  }
  if (typeof b['jobNotificationsEnabled'] !== 'boolean') return false;
  return true;
}

function toResponse(row: PreferencesRow) {
  return {
    id: row.id,
    email: row.email,
    jobScoreThreshold: row.job_score_threshold,
    jobNotificationsEnabled: row.job_notifications_enabled,
    unsubscribedAt: row.unsubscribed_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select(
      'id, email, job_score_threshold, job_notifications_enabled, unsubscribed_at, updated_at'
    )
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    captureApiError(
      new Error(error.message),
      '/api/jobs/notifications/preferences',
      'GET',
      500
    );
    return NextResponse.json({ error: 'Query failed' }, { status: 500 });
  }

  const row = data?.[0] as PreferencesRow | undefined;
  return NextResponse.json({ preferences: row ? toResponse(row) : null });
}

export async function PUT(request: NextRequest) {
  const session = await readAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const upsertRow = {
    email: body.email,
    job_score_threshold: body.jobScoreThreshold,
    job_notifications_enabled: body.jobNotificationsEnabled,
    unsubscribed_at: body.jobNotificationsEnabled ? null : undefined,
  };

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert(upsertRow, { onConflict: 'email' })
    .select(
      'id, email, job_score_threshold, job_notifications_enabled, unsubscribed_at, updated_at'
    )
    .single();

  if (error) {
    captureApiError(
      new Error(error.message),
      '/api/jobs/notifications/preferences',
      'PUT',
      500,
      { email: body.email }
    );
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json({ preferences: toResponse(data as PreferencesRow) });
}
