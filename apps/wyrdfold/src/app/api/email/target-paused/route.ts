import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

interface TargetPausedPayload {
  to: string;
  targetLabels: string[];
  idleDays: number;
}

function isValidPayload(body: unknown): body is TargetPausedPayload {
  if (!body || typeof body !== 'object') return false;
  const b = body as Partial<TargetPausedPayload>;
  return (
    typeof b.to === 'string' &&
    b.to.includes('@') &&
    Array.isArray(b.targetLabels) &&
    typeof b.idleDays === 'number'
  );
}

/**
 * Server-to-server endpoint: the wyrdfold-api lifecycle sweep posts here
 * (Bearer JOB_ALERT_SECRET) when it auto-pauses an idle user's targets.
 * One plain transactional email via Resend — no tracking, no list.
 */
export async function POST(request: NextRequest) {
  const secret = process.env['JOB_ALERT_SECRET'];
  const authHeader = request.headers.get('authorization') ?? '';
  const presented = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';
  if (!secret || !constantTimeEqual(presented, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Email not configured' },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!isValidPayload(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { to, targetLabels, idleDays } = body;
  const labels = targetLabels.filter(Boolean).slice(0, 10);
  const targetList =
    labels.length > 0
      ? `<ul>${labels.map(l => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`
      : '<p>your active target</p>';
  const appUrl = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://wyrdfold.com';

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from: 'WyrdFold <notifications@wyrdfold.com>',
    to,
    subject: 'Your WyrdFold target was paused',
    html: [
      `<p>You haven't signed in for ${idleDays} days, so we paused job`,
      ` matching for:</p>`,
      targetList,
      `<p>Nothing was deleted — <a href="${appUrl}/targets">log in and`,
      ` reactivate</a> whenever you're ready to resume.</p>`,
    ].join(''),
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }
  return NextResponse.json({ resendId: data?.id ?? null });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
