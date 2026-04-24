import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createResendClient, EMAIL_FROM } from '@/lib/email/resend';
import { buildProfileUnsubscribeUrl } from '@/lib/email/tokens';
import { captureApiError } from '@/lib/errorTracking';
import JobAlertEmail from '@/components/emails/JobAlert';

interface JobAlertPayload {
  profileId: string;
  to: string;
  jobId: string;
  title: string;
  company: string;
  location: string | null;
  score: number;
  jobUrl: string;
}

function bearerMatches(header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const prefix = 'Bearer ';
  if (!header.startsWith(prefix)) return false;
  const presented = header.slice(prefix.length);
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isValidPayload(body: unknown): body is JobAlertPayload {
  if (!body || typeof body !== 'object') return false;
  const p = body as Record<string, unknown>;
  return (
    typeof p['profileId'] === 'string' &&
    typeof p['to'] === 'string' &&
    typeof p['jobId'] === 'string' &&
    typeof p['title'] === 'string' &&
    typeof p['company'] === 'string' &&
    (p['location'] === null || typeof p['location'] === 'string') &&
    typeof p['score'] === 'number' &&
    typeof p['jobUrl'] === 'string'
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env['JOB_ALERT_SECRET'];
  if (!secret) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get('authorization'), secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isValidPayload(payload)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const resend = createResendClient();
  if (!resend) {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }

  const siteUrl =
    process.env['NEXT_PUBLIC_SITE_URL'] || 'https://danieljoffe.com';
  const fittedUrl = `${siteUrl}/fitted/jobs/${payload.jobId}`;
  const unsubscribeUrl = buildProfileUnsubscribeUrl(payload.profileId, siteUrl);

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: payload.to,
      subject: `${payload.title} at ${payload.company} — score ${payload.score}`,
      react: JobAlertEmail({
        title: payload.title,
        company: payload.company,
        location: payload.location,
        score: payload.score,
        jobUrl: payload.jobUrl,
        fittedUrl,
        unsubscribeUrl,
      }),
    });

    if (error) {
      captureApiError(
        new Error(error.message),
        '/api/email/job-alert',
        'POST',
        502,
        { jobId: payload.jobId, profileId: payload.profileId }
      );
      return NextResponse.json({ error: 'Send failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true, resendId: data?.id ?? null });
  } catch (err) {
    captureApiError(err, '/api/email/job-alert', 'POST', 500, {
      jobId: payload.jobId,
      profileId: payload.profileId,
    });
    return NextResponse.json({ error: 'Send failed' }, { status: 500 });
  }
}
