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
  const cronSecret = process.env['CRON_SECRET'];
  const authHeader = request.headers.get('authorization') ?? '';
  const presented = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length)
    : '';
  const isCron = !!cronSecret && constantTimeEqual(presented, cronSecret);

  if (!isCron && !(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return proxyToFastAPI('/poll', { method: 'POST' });
}
