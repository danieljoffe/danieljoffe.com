import { headers } from 'next/headers';
import { DOMAIN_URL } from '@/utils/constants';

/**
 * Resolve the app origin for server-side fetch calls.
 * Uses DOMAIN_URL in production (trusted) and falls back to the host header
 * in development for localhost support.
 */
export async function getOrigin(): Promise<string> {
  // VERCEL_URL is the *.vercel.app deployment URL, which sits behind
  // Deployment Protection — self-fetches through it hit the auth wall
  // instead of the API. Production must use the public domain.
  if (process.env.VERCEL_ENV === 'production') {
    return DOMAIN_URL;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  if (process.env.NODE_ENV === 'production') {
    return DOMAIN_URL;
  }

  const headersList = await headers();
  const host = headersList.get('host') ?? 'localhost:3000';
  const protocol = host.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}
