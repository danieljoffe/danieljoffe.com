import { NextResponse } from 'next/server';

const JOB_API_URL = process.env['JOB_API_URL'] ?? 'http://localhost:8000';
const JOB_API_KEY = process.env['JOB_API_KEY'] ?? '';
const JOBS_ADMIN_PASSWORD = process.env['JOBS_ADMIN_PASSWORD'] ?? '';

export function verifyJobsAdmin(request: Request): string | null {
  const password = request.headers.get('x-admin-password');
  if (!JOBS_ADMIN_PASSWORD || password !== JOBS_ADMIN_PASSWORD) {
    return null;
  }
  return password;
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

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'x-api-key': JOB_API_KEY,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Job API unavailable' }, { status: 503 });
  }
}
