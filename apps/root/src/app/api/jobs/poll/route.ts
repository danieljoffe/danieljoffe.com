import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';

export async function POST(request: NextRequest) {
  // Allow cron secret OR admin password
  const cronSecret = process.env['CRON_SECRET'];
  const authHeader = request.headers.get('authorization');
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron && !verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return proxyToFastAPI('/poll', { method: 'POST' });
}
