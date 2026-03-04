'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];
/**
 * Returns a singleton Supabase client for browser-side operations using the anon key.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  if (client) return client;
  if (!supabaseUrl || !anonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_ID environment variables'
    );
  }

  client = createClient(supabaseUrl, anonKey);
  return client;
}
