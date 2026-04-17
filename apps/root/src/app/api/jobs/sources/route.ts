import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI } from '../proxy';

type SourceAction =
  | { action: 'add'; board_token: string; company_name: string }
  | { action: 'remove' | 'toggle'; board_token: string }
  | { action: 'seed' };

export async function GET() {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return proxyToFastAPI('/sources');
}

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as SourceAction;
  const path = body.action === 'seed' ? '/sources/seed' : '/sources';
  return proxyToFastAPI(path, { method: 'POST', body });
}
