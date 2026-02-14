import { createHash } from 'node:crypto';

export function normalizeUrl(url: string): string {
  let normalized = url.trim().toLowerCase();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  normalized = normalized.replace(/\/+$/, '');
  normalized = normalized.replace(/^(https?:\/\/)www\./, '$1');
  return normalized;
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
