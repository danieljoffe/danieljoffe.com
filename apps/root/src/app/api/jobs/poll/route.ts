import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

export async function POST(request: NextRequest) {
  console.log('[jobs/poll] POST entry');

  const cronSecret = process.env['CRON_SECRET'];
  const authHeader = request.headers.get('authorization') ?? '';
  const presented = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';
  const isCron = !!cronSecret && constantTimeEqual(presented, cronSecret);

  console.log('[jobs/poll] auth check', {
    cronSecretSet: !!cronSecret,
    authHeaderPresent: !!authHeader,
    authHeaderStartsWithBearer: authHeader.startsWith('Bearer '),
    presentedLength: presented.length,
    isCron,
  });

  if (!isCron) {
    const adminOk = await verifyJobsAdmin();
    console.log('[jobs/poll] admin session check', { adminOk });
    if (!adminOk) {
      console.log('[jobs/poll] rejecting 401 (no cron, no admin)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[jobs/poll] proceeding via admin session');
  } else {
    console.log('[jobs/poll] proceeding via cron secret');
  }

  return proxyToFastAPI('/poll', { method: 'POST' });
}
