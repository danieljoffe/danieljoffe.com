import { NextResponse } from 'next/server';

import { createAuthServerClient } from '@/lib/supabase/auth-server';

/** Read at call-time so route handlers see the live env (test-friendly). */
function apiBaseUrl(): string {
  return process.env['WYRDFOLD_API_URL'] ?? '';
}

/** Default upstream timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000;
/** Longer timeout for LLM-backed routes (conversation, derive, tailor). */
export const LLM_TIMEOUT_MS = 120_000;

/**
 * Resolve the current Supabase session's access token. Returns null when
 * the request has no session — callers should treat that as 401 and skip
 * the upstream round-trip.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = await createAuthServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function unavailable(err: unknown): NextResponse {
  const detail =
    process.env.NODE_ENV !== 'production' && err instanceof Error
      ? {
          message: err.message,
          cause: err.cause ? String(err.cause) : undefined,
        }
      : undefined;
  return NextResponse.json(
    { error: 'WyrdFold API unavailable', ...(detail ? { detail } : {}) },
    { status: 503 }
  );
}

function nonJsonUpstream(rawBody: string, status: number): NextResponse {
  return NextResponse.json(
    {
      error: 'Upstream returned non-JSON',
      upstreamStatus: status,
      ...(process.env.NODE_ENV !== 'production'
        ? { bodyPreview: rawBody.slice(0, 300) }
        : {}),
    },
    { status: 502 }
  );
}

/**
 * Forward a JSON request/response to wyrdfold-api with the user's
 * Supabase JWT as Bearer auth.
 *
 * `binary: true` returns the raw response body (bytes) with the
 * upstream Content-Type/Disposition preserved — used for `.docx`
 * downloads and zip exports.
 */
export async function proxyToWyrdfoldAPI(
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

  const accessToken = await getAccessToken();
  if (accessToken === null) return unauthorized();

  const qs = searchParams ? `?${searchParams.toString()}` : '';
  const url = `${apiBaseUrl()}${path}${qs}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });

    if (binary) {
      const buffer = await res.arrayBuffer();
      const headers: Record<string, string> = {
        'Content-Type':
          res.headers.get('Content-Type') ?? 'application/octet-stream',
      };
      const disposition = res.headers.get('Content-Disposition');
      if (disposition) headers['Content-Disposition'] = disposition;
      return new NextResponse(buffer, { status: res.status, headers });
    }

    const rawBody = await res.text();
    try {
      return NextResponse.json(JSON.parse(rawBody), { status: res.status });
    } catch {
      return nonJsonUpstream(rawBody, res.status);
    }
  } catch (err) {
    return unavailable(err);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stream the upstream response body straight through. Used for SSE
 * endpoints — buffering would defeat the point. The caller's
 * `Request.signal` cancels the upstream fetch when the client
 * disconnects, so we don't leave LLM calls running.
 */
export async function proxyStreamingToWyrdfoldAPI(
  path: string,
  request: Request,
  options: { method?: string; body?: unknown } = {}
): Promise<NextResponse> {
  const { method = 'POST', body } = options;

  const accessToken = await getAccessToken();
  if (accessToken === null) return unauthorized();

  const url = `${apiBaseUrl()}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : null,
      signal: request.signal,
    });
  } catch (err) {
    return unavailable(err);
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
 * Forward a multipart/form-data request to wyrdfold-api. Pipes the raw
 * body through so the multipart boundary is preserved.
 */
export async function proxyMultipartToWyrdfoldAPI(
  path: string,
  request: Request,
  options: { searchParams?: URLSearchParams; timeoutMs?: number } = {}
): Promise<NextResponse> {
  const { searchParams } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const accessToken = await getAccessToken();
  if (accessToken === null) return unauthorized();

  const qs = searchParams ? `?${searchParams.toString()}` : '';
  const url = `${apiBaseUrl()}${path}${qs}`;
  const contentType = request.headers.get('Content-Type') ?? '';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': contentType,
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
      return nonJsonUpstream(rawBody, res.status);
    }
  } catch (err) {
    return unavailable(err);
  } finally {
    clearTimeout(timer);
  }
}
