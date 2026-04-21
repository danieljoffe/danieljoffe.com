import { NextResponse } from 'next/server';
import { readAdminSession, readAdminSessionToken } from '@/lib/adminSession';

const JOB_API_URL = process.env['JOB_API_URL'] ?? '';
const JOB_API_KEY = process.env['JOB_API_KEY'] ?? '';

export async function verifyJobsAdmin(): Promise<boolean> {
  const session = await readAdminSession();
  console.log('[jobs proxy] verifyJobsAdmin', {
    hasSession: session !== null,
  });
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

  console.log('[jobs proxy] outbound', {
    method,
    url,
    hasJobApiUrl: !!JOB_API_URL,
    hasJobApiKey: !!JOB_API_KEY,
    hasSessionToken: !!sessionToken,
    hasBody: body !== undefined,
  });

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

    const contentType = res.headers.get('content-type') ?? '';
    const rawBody = await res.text();
    console.log('[jobs proxy] upstream response', {
      url,
      status: res.status,
      contentType,
      bodyPreview: rawBody.slice(0, 300),
    });

    let data: unknown;
    try {
      data = JSON.parse(rawBody);
    } catch {
      console.error('[jobs proxy] upstream returned non-JSON body', {
        status: res.status,
        contentType,
        bodyPreview: rawBody.slice(0, 300),
      });
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
