import { createHash } from 'node:crypto';

export function normalizeUrl(url: string): string {
  let raw = url.trim().toLowerCase();
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  const parsed = new URL(raw);

  // Strip www. prefix
  parsed.hostname = parsed.hostname.replace(/^www\./, '');

  // Remove default ports (80 for http, 443 for https)
  if (
    (parsed.protocol === 'https:' && parsed.port === '443') ||
    (parsed.protocol === 'http:' && parsed.port === '80')
  ) {
    parsed.port = '';
  }

  // Collapse duplicate slashes in pathname
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/');

  // Remove trailing slash from pathname (keep root "/" as empty)
  if (parsed.pathname.length > 1) {
    parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  }

  // Sort query parameters for consistent ordering
  if (parsed.search) {
    const params = new URLSearchParams(parsed.searchParams);
    const sorted = new URLSearchParams([...params.entries()].sort());
    parsed.search = sorted.toString();
  }

  // Remove fragment
  parsed.hash = '';

  // Build result from parts to avoid URL.toString() always adding "/" to
  // bare origins (e.g. "https://example.com/" instead of "https://example.com").
  const port = parsed.port ? `:${parsed.port}` : '';
  const pathname =
    parsed.pathname === '/' ? '' : parsed.pathname;
  const search = parsed.search;

  return `${parsed.protocol}//${parsed.hostname}${port}${pathname}${search}`;
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(normalizeUrl(url));
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;

    const hostname = parsed.hostname;
    if (hostname === 'localhost') return false;
    if (hostname === '::1' || hostname === '[::1]') return false;
    if (/^127\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^10\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(hostname)) return false;
    if (hostname === '0.0.0.0') return false;
    if (/^169\.254\./.test(hostname)) return false;
    if (/^\[?fe80:/i.test(hostname)) return false;
    if (!hostname.includes('.')) return false;

    return true;
  } catch {
    return false;
  }
  // NOTE: This does not fully prevent SSRF via DNS rebinding. For production
  // hardening, resolve the hostname server-side before passing to the scanner
  // and verify the resolved IP is not in a private range.
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + (process.env['IP_HASH_SALT'] || 'audit-tool'))
    .digest('hex')
    .slice(0, 16);
}
