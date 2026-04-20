const ALLOWED_HOSTS = new Set([
  'danieljoffe.com',
  'www.danieljoffe.com',
  'localhost:3000',
]);

const VERCEL_PROJECT_PREFIX = 'danieljoffe-com';

/**
 * Reject requests that don't originate from the production site (or local dev).
 * Public insights endpoints are unauthenticated; same-origin is the cheap
 * first line of defense against external scrapers reusing the response shape.
 *
 * Vercel preview deployments are allowed via a project-prefixed `*.vercel.app`
 * suffix so PR previews stay testable without exposing the endpoint to any
 * unrelated Vercel-hosted site.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const candidate = origin ?? referer;
  if (!candidate) return false;

  let host: string;
  try {
    host = new URL(candidate).host;
  } catch {
    return false;
  }

  if (ALLOWED_HOSTS.has(host)) return true;
  if (
    host.endsWith('.vercel.app') &&
    (host === `${VERCEL_PROJECT_PREFIX}.vercel.app` ||
      host.startsWith(`${VERCEL_PROJECT_PREFIX}-`))
  ) {
    return true;
  }
  return false;
}
