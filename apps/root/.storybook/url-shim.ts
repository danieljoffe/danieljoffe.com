/**
 * Minimal browser-compatible shim for Node's `url` module.
 * Only implements `format` which is used by next-transition-router.
 */

interface UrlObject {
  protocol?: string | null;
  auth?: string | null;
  hostname?: string | null;
  host?: string | null;
  port?: string | number | null;
  pathname?: string | null;
  search?: string | null;
  query?: string | Record<string, string> | null;
  hash?: string | null;
}

export function format(urlObj: string | UrlObject): string {
  if (typeof urlObj === 'string') return urlObj;

  let result = '';

  if (urlObj.protocol) {
    result += urlObj.protocol;
    if (!result.endsWith('//')) result += '//';
  }

  if (urlObj.auth) {
    result += `${urlObj.auth}@`;
  }

  if (urlObj.hostname || urlObj.host) {
    result += urlObj.host || urlObj.hostname;
    if (urlObj.port && !urlObj.host) {
      result += `:${urlObj.port}`;
    }
  }

  if (urlObj.pathname) {
    result += urlObj.pathname;
  }

  if (urlObj.search) {
    result += urlObj.search;
  } else if (urlObj.query) {
    const q =
      typeof urlObj.query === 'string'
        ? urlObj.query
        : new URLSearchParams(urlObj.query).toString();
    if (q) result += `?${q}`;
  }

  if (urlObj.hash) {
    result += urlObj.hash;
  }

  return result;
}
