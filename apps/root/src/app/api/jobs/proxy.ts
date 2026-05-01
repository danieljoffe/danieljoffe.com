import { NextResponse } from 'next/server';
import { readAdminSession, readAdminSessionToken } from '@/lib/adminSession';
import { createAuthServerClient } from '@/lib/supabase/auth-server';

const JOB_API_URL = process.env['JOB_API_URL'] ?? '';
const JOB_API_KEY = process.env['JOB_API_KEY'] ?? '';

/**
 * Verify access: accepts either an admin session cookie (admin dashboard)
 * or a valid Supabase session (Fitted app via magic link).
 */
export async function verifyJobsAccess(): Promise<boolean> {
  const adminSession = await readAdminSession();
  if (adminSession !== null) return true;

  try {
    const supabase = await createAuthServerClient();
    const { data } = await supabase.auth.getUser();
    return data.user !== null;
  } catch {
    return false;
  }
}

/** Default upstream timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** Longer timeout for LLM-backed routes (conversation, derive, tailor). */
export const LLM_TIMEOUT_MS = 120_000;

export async function proxyToFastAPI(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    searchParams?: URLSearchParams;
    binary?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<NextResponse> {
  const { method = 'GET', body, searchParams, binary = false } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const qs = searchParams ? `?${searchParams.toString()}` : '';
  const url = `${JOB_API_URL}${path}${qs}`;

  const sessionToken = await readAdminSessionToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'x-api-key': JOB_API_KEY,
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });

    // Binary mode: pass through raw bytes with original headers
    if (binary) {
      const buffer = await res.arrayBuffer();
      return new NextResponse(buffer, {
        status: res.status,
        headers: {
          'Content-Type':
            res.headers.get('Content-Type') ?? 'application/octet-stream',
          ...(res.headers.get('Content-Disposition')
            ? { 'Content-Disposition': res.headers.get('Content-Disposition')! }
            : {}),
        },
      });
    }

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
        ? {
            message: err.message,
            cause: err.cause ? String(err.cause) : undefined,
          }
        : undefined;
    return NextResponse.json(
      { error: 'Job API unavailable', ...(detail ? { detail } : {}) },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Forward a request and stream the FastAPI response body straight through.
 * Used for SSE endpoints where each upstream chunk should reach the browser
 * as it arrives — `proxyToFastAPI` would buffer the full body and defeat
 * the point of streaming.
 *
 * The caller's `Request.signal` is passed to fetch so that a client-side
 * disconnect (closed EventSource, navigated-away tab) cancels the upstream
 * fetch instead of leaving the LLM call running.
 */
export async function proxyStreamingToFastAPI(
  path: string,
  request: Request,
  options: { method?: string; body?: unknown } = {}
): Promise<NextResponse> {
  const { method = 'POST', body } = options;
  const url = `${JOB_API_URL}${path}`;
  const sessionToken = await readAdminSessionToken();

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        'x-api-key': JOB_API_KEY,
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: body ? JSON.stringify(body) : null,
      signal: request.signal,
    });
  } catch (err) {
    const detail =
      process.env.NODE_ENV !== 'production' && err instanceof Error
        ? { message: err.message }
        : undefined;
    return NextResponse.json(
      { error: 'Job API unavailable', ...(detail ? { detail } : {}) },
      { status: 503 }
    );
  }

  // Non-streaming error path: surface upstream errors as JSON before any
  // SSE frames. The upstream emits text/event-stream only on success.
  if (!res.ok || !res.body) {
    const text = await res.text();
    try {
      return NextResponse.json(JSON.parse(text), { status: res.status });
    } catch {
      return NextResponse.json(
        { error: 'Upstream error', upstreamStatus: res.status },
        { status: res.status || 502 }
      );
    }
  }

  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': res.headers.get('Content-Type') ?? 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

/**
 * Forward a multipart/form-data request to the FastAPI backend.
 *
 * Unlike `proxyToFastAPI` (which JSON-serializes the body), this passes
 * the raw request body through so the multipart boundary is preserved.
 */
export async function proxyMultipartToFastAPI(
  path: string,
  request: Request,
  options: { searchParams?: URLSearchParams; timeoutMs?: number } = {}
): Promise<NextResponse> {
  const { searchParams } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const qs = searchParams ? `?${searchParams.toString()}` : '';
  const url = `${JOB_API_URL}${path}${qs}`;

  const sessionToken = await readAdminSessionToken();
  const contentType = request.headers.get('Content-Type') ?? '';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': JOB_API_KEY,
        'Content-Type': contentType,
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      body: request.body,
      signal: controller.signal,
      // @ts-expect-error -- Node fetch supports duplex for streaming request bodies
      duplex: 'half',
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
        ? {
            message: err.message,
            cause: err.cause ? String(err.cause) : undefined,
          }
        : undefined;
    return NextResponse.json(
      { error: 'Job API unavailable', ...(detail ? { detail } : {}) },
      { status: 503 }
    );
  } finally {
    clearTimeout(timer);
  }
}
