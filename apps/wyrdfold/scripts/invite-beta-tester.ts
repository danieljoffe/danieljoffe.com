/**
 * Invite a beta tester to the wyrdfold app.
 *
 * Inserts the email into public.wyrdfold_beta_invites first so the
 * before-user-created auth hook (hook_restrict_wyrdfold_beta) lets the
 * subsequent admin invite through. Then calls the GoTrue admin API to send
 * the invitation email, which seeds the auth.users row.
 *
 * Usage:
 *   SUPABASE_URL=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   pnpm --filter @danieljoffe.com/wyrdfold invite-beta tester@example.com
 */

import { createClient } from '@supabase/supabase-js';

const REDIRECT_TO = 'https://wyrdfold.com/auth/callback';

async function main(): Promise<void> {
  const rawEmail = process.argv[2];
  if (!rawEmail) {
    throw new Error('Usage: pnpm invite-beta <email>');
  }
  const email = rawEmail.trim().toLowerCase();

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment.'
    );
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: insertErr } = await admin
    .from('wyrdfold_beta_invites')
    .upsert({ email });
  if (insertErr) {
    throw new Error(`Failed to upsert allowlist row: ${insertErr.message}`);
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: REDIRECT_TO,
  });
  if (error) {
    throw new Error(`inviteUserByEmail failed: ${error.message}`);
  }

  console.log(`Invited ${data.user?.email ?? email}`);
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
