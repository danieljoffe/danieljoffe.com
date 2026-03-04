import { createClient } from '@supabase/supabase-js';
import { devLog } from '@/utils/helpers';

/**
 * Creates a Supabase client for server-side operations using the service role key.
 * Returns a new client each call to avoid stale connections in serverless environments.
 */
const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];

export function createServerSupabaseClient() {
  if (!supabaseUrl || !serviceRoleKey) {
    devLog(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    );
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
