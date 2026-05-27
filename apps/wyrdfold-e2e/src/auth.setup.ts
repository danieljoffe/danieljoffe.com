import path from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * One-shot Supabase magic-link OTP sign-in that produces a storageState
 * file the authenticated specs reuse. Skips entirely when the four
 * required env vars are absent — that's the CI default until the
 * secrets are wired up (see ``apps/wyrdfold-e2e/README.md`` for
 * setup steps), so the un-authed specs (login, middleware) still run
 * cleanly there.
 *
 * Why OTP via service role instead of password sign-in:
 *   - The wyrdfold login UI is magic-link only (``signInWithOtp``).
 *     A password-sign-in fixture diverges from the production auth
 *     path and only works if the test user happens to have a
 *     password set in addition to OTP.
 *   - ``admin.generateLink({type:'magiclink'})`` returns the email
 *     OTP without sending an email, which ``verifyOtp`` can then
 *     exchange for a real session. No inbox round-trip, but does
 *     need the service-role key.
 *   - The supabase-js client stores the session in localStorage by
 *     default; the wyrdfold app reads it from cookies via
 *     ``@supabase/ssr``. We construct the cookie blob manually in
 *     the exact shape ``createServerClient`` parses.
 */

// CJS context (Playwright transforms TS as CJS), ``__dirname`` is the
// directory of this file at runtime.
export const AUTH_STORAGE_STATE = path.join(__dirname, '.auth', 'user.json');

const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
const anonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_ID'];
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
const email = process.env['E2E_TEST_USER_EMAIL'];

setup('authenticate via Supabase magic-link OTP', async ({ page, context }) => {
  // Skip when any env var is missing — CI without the e2e secrets
  // shouldn't fail this step, it just won't have any authed specs
  // to run.
  setup.skip(
    !url || !anonKey || !serviceRoleKey || !email,
    'E2E auth env not set: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_ID, SUPABASE_SERVICE_ROLE_KEY, E2E_TEST_USER_EMAIL. Run setup locally first; see apps/wyrdfold-e2e/README.md.'
  );

  // TypeScript narrowing — setup.skip with truthy-test guarantees
  // these are defined but TS can't infer that.
  if (!url || !anonKey || !serviceRoleKey || !email) return;

  // Mint an OTP without sending the email.
  const admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkData, error: linkErr } =
    await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (linkErr || !linkData.properties?.email_otp) {
    throw new Error(
      `generateLink failed: ${linkErr?.message ?? 'no email_otp returned'}`
    );
  }

  // Exchange the OTP for a real session on the anon client — same
  // code path as a real user clicking the magic-link.
  const supabase = createClient(url, anonKey);
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token: linkData.properties.email_otp,
    type: 'magiclink',
  });
  if (error || !data.session) {
    throw new Error(`verifyOtp failed: ${error?.message ?? 'no session'}`);
  }

  // Reconstruct the cookie shape ``@supabase/ssr`` writes on the
  // browser side. Cookie name format is
  // ``sb-<project-ref>-auth-token``; the project ref is the first
  // subdomain segment of ``NEXT_PUBLIC_SUPABASE_URL``. Value is the
  // base64-prefixed JSON-encoded session.
  const projectRef = new URL(url).hostname.split('.')[0];
  const sessionBlob = {
    access_token: data.session.access_token,
    token_type: 'bearer',
    expires_in: data.session.expires_in,
    expires_at: data.session.expires_at,
    refresh_token: data.session.refresh_token,
    user: data.user,
  };
  const cookieValue = `base64-${Buffer.from(
    JSON.stringify(sessionBlob),
    'utf-8'
  ).toString('base64')}`;

  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: cookieValue,
      domain: 'localhost',
      path: '/',
      // Match the middleware-set cookie's flags so the session sticks
      // across navigations.
      httpOnly: false,
      sameSite: 'Lax',
      expires: data.session.expires_at ?? -1,
    },
  ]);

  // Smoke the session by hitting /dashboard. If the cookie wasn't
  // accepted (wrong shape, expired, wrong domain), middleware
  // redirects to /login and this assertion fails fast.
  await page.goto('/dashboard');
  await expect(page).not.toHaveURL(/\/login/);

  await context.storageState({ path: AUTH_STORAGE_STATE });
});
