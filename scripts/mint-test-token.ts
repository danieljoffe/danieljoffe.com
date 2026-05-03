#!/usr/bin/env tsx
/**
 * Mint a Supabase access token for smoke-testing wyrdfold.
 *
 * Uses the admin-flow magic link: the service role key generates a
 * magic link without sending an email, then we exchange the hashed
 * token for a session via `verifyOtp`. Same OTP shape as production
 * (which uses `signInWithOtp` → click the email link → callback →
 * `verifyOtp`), just inbox-free.
 *
 * Usage (from repo root):
 *
 *   set -a; source apps/wyrdfold/.env; set +a       # URL + anon key
 *   set -a; source apps/wyrdfold-api/.env; set +a   # service role key
 *   export TEST_EMAIL=smoke@local.test
 *   TOKEN=$(pnpm tsx scripts/mint-test-token.ts)
 *   curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/jobs
 *
 * Prereq: the user must already exist in Supabase Auth. Create one
 * in Dashboard → Authentication → Users → "Add user". No password
 * needed — the admin link doesn't depend on one.
 */
import { createClient } from '@supabase/supabase-js';

async function main(): Promise<void> {
  const url =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ?? process.env['SUPABASE_URL'];
  const anonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'] ??
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    process.env['SUPABASE_ANON_KEY'];
  const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  const email = process.env['TEST_EMAIL'];

  const missing: string[] = [];
  if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_ID');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!email) missing.push('TEST_EMAIL');
  if (missing.length) {
    console.error(`Missing env: ${missing.join(', ')}`);
    process.exit(1);
  }

  const admin = createClient(url!, serviceRoleKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: email!,
    });

  if (linkError) {
    console.error(`Magic link generation failed: ${linkError.message}`);
    console.error(
      'Hint: the user must exist in Supabase Auth (Dashboard → Authentication → Users).'
    );
    process.exit(1);
  }

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) {
    console.error('Magic link returned no hashed_token');
    process.exit(1);
  }

  const supabase = createClient(url!, anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // verifyOtp expects type:'email' when consuming a hashed_token from a
  // magic-link generation — this is the canonical Supabase pattern even
  // though the link itself is "magiclink" type.
  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'email',
  });

  if (error) {
    console.error(`OTP verification failed: ${error.message}`);
    process.exit(1);
  }

  if (!data.session) {
    console.error('OTP verified but no session returned');
    process.exit(1);
  }

  process.stdout.write(data.session.access_token);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
