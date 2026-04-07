import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from '../proxy';

export async function POST(request: NextRequest) {
  // Allow cron secret OR admin password
  const cronSecret = process.env['CRON_SECRET'];
  const authHeader = request.headers.get('authorization');
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron && !verifyJobsAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (IS_MOCK_MODE) {
    return NextResponse.json({
      sources_polled: 15,
      new_jobs: 3,
      updated_jobs: 7,
      errors: [],
    });
  }

  return proxyToFastAPI('/poll', { method: 'POST' });
}
