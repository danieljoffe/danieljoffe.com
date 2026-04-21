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

    const rawBody = await res.text();
    try {
      return NextResponse.json(JSON.parse(rawBody), { status: res.status });
    } catch {
      return NextResponse.json(
        {
          error: 'Upstream returned non-JSON',
          upstreamStatus: res.status,
          ...(process.env.NODE_ENV !== 'production'
            ? { bodyPreview: rawBody.slice(0, 300) }
            : {}),
        },
        { status: 502 }
      );
    }
  } catch (err) {
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
