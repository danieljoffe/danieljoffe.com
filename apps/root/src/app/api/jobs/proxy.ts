import { NextResponse } from 'next/server';
import { readAdminSession, readAdminSessionToken } from '@/lib/adminSession';

const JOB_API_URL = process.env['JOB_API_URL'] ?? '';
const JOB_API_KEY = process.env['JOB_API_KEY'] ?? '';

export async function verifyJobsAdmin(): Promise<boolean> {
  const session = await readAdminSession();
  return session !== null;
}

export async function proxyToFastAPI(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: URLSearchParams;
  } = {}
): Promise<NextResponse> {
  const { method = 'GET', body, searchParams } = options;
  const qs = searchParams ? `?${searchParams.toString()}` : '';
  const url = `${JOB_API_URL}${path}${qs}`;

  const sessionToken = await readAdminSessionToken();

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'x-api-key': JOB_API_KEY,
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('[jobs proxy] fetch failed', {
      url,
      hasJobApiUrl: !!JOB_API_URL,
      hasJobApiKey: !!JOB_API_KEY,
      error: err instanceof Error ? err.message : String(err),
      cause: err instanceof Error && err.cause ? String(err.cause) : undefined,
    });
    const detail =
      process.env.NODE_ENV !== 'production' && err instanceof Error
        ? { message: err.message, cause: err.cause ? String(err.cause) : undefined }
        : undefined;
    return NextResponse.json(
      { error: 'Job API unavailable', ...(detail ? { detail } : {}) },
      { status: 503 }
    );
  }
}
