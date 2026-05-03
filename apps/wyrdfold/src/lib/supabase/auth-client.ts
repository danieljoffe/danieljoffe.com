'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase client for browser-side auth operations.
 * Uses @supabase/ssr for automatic cookie-based session management.
 */
export function createAuthBrowserClient() {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];

  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_ID environment variables'
    );
  }

  return createBrowserClient(supabaseUrl, anonKey);
}
