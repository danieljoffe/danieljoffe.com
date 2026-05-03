import { type NextRequest, NextResponse } from 'next/server';

import { proxyToWyrdfoldAPI } from '@/lib/api/proxy';

// Email alerts are sent by the Next.js layer via Resend; the FastAPI
// only knows it can call back into us. AND its `email_available` flag
// with the actual Resend key check so a half-configured deployment
// (FastAPI knows where to call but Resend isn't wired up) reads as off.
function hasResendKey(): boolean {
  return Boolean(process.env['RESEND_API_KEY']);
}

export async function GET() {
  const upstream = await proxyToWyrdfoldAPI('/profile/notifications');
  if (upstream.status !== 200) return upstream;
  const body = (await upstream.json()) as Record<string, unknown> & {
    email_available?: boolean;
  };
  body.email_available = Boolean(body.email_available) && hasResendKey();
  return NextResponse.json(body);
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  if (body['job_notifications_enabled'] === true && !hasResendKey()) {
    return NextResponse.json(
      {
        detail:
          'Email notifications are unavailable: the operator has not configured email provider credentials.',
      },
      { status: 400 }
    );
  }
  return proxyToWyrdfoldAPI('/profile/notifications', {
    method: 'PATCH',
    body,
  });
}
