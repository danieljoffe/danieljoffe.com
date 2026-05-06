import { timingSafeEqual } from 'node:crypto';
import { type NextRequest, NextResponse } from 'next/server';

import { getAccessToken } from '@/lib/api/proxy';

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

  if (!isCron) {
    const accessToken = await getAccessToken();
    if (accessToken === null) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // Upstream /poll is API-key-gated (cron path). Convert here regardless of
  // whether the caller arrived via cron secret or session — the BFF is the
  // only thing that holds the API key.
  const apiKey = process.env['WYRDFOLD_API_KEY'];
  if (!apiKey) {
    return NextResponse.json(
      { error: 'WYRDFOLD_API_KEY not configured' },
      { status: 503 }
    );
  }

  const baseUrl = process.env['WYRDFOLD_API_URL'] ?? '';
  try {
    const res = await fetch(`${baseUrl}/poll`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
    });
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json(
        { error: 'Upstream returned non-JSON', upstreamStatus: res.status },
        { status: 502 }
      );
    }
  } catch (err) {
    const detail =
      process.env.NODE_ENV !== 'production' && err instanceof Error
        ? { message: err.message }
        : undefined;
    return NextResponse.json(
      {
        error: 'WyrdFold API unavailable',
        ...(detail ? { detail } : {}),
      },
      { status: 503 }
    );
  }
}
