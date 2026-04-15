import { type NextRequest, NextResponse } from 'next/server';
import { verifyJobsAdmin, proxyToFastAPI, IS_MOCK_MODE } from '../proxy';
import { MOCK_SOURCES, type MockSource } from '../mockData';

type SourceAction =
  | { action: 'add'; board_token: string; company_name: string }
  | { action: 'remove' | 'toggle'; board_token: string }
  | { action: 'seed' };

function handleMockAction(body: SourceAction): NextResponse {
  if (body.action === 'toggle') {
    const source = MOCK_SOURCES.find(s => s.board_token === body.board_token);
    if (!source) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }
    source.enabled = !source.enabled;
    return NextResponse.json({ success: true, enabled: source.enabled });
  }

  if (body.action === 'remove') {
    const idx = MOCK_SOURCES.findIndex(s => s.board_token === body.board_token);
    if (idx >= 0) MOCK_SOURCES.splice(idx, 1);
    return NextResponse.json({ success: true });
  }

  if (body.action === 'add') {
    if (MOCK_SOURCES.some(s => s.board_token === body.board_token)) {
      return NextResponse.json(
        { error: 'Source already exists' },
        { status: 409 }
      );
    }
    const source: MockSource = {
      id: `src-${body.board_token}`,
      board_token: body.board_token,
      company_name: body.company_name,
      enabled: true,
      last_polled_at: null,
      job_count: 0,
    };
    MOCK_SOURCES.push(source);
    return NextResponse.json({ success: true, source });
  }

  if (body.action === 'seed') {
    return NextResponse.json({ success: true, seeded: MOCK_SOURCES.length });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function GET() {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (IS_MOCK_MODE) {
    return NextResponse.json({ sources: MOCK_SOURCES });
  }

  return proxyToFastAPI('/sources');
}

export async function POST(request: NextRequest) {
  if (!(await verifyJobsAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json()) as SourceAction;

  if (IS_MOCK_MODE) {
    return handleMockAction(body);
  }

  const path = body.action === 'seed' ? '/sources/seed' : '/sources';
  return proxyToFastAPI(path, { method: 'POST', body });
}
