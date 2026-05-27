# wyrdfold-e2e

Playwright suite for the wyrdfold app. Two tiers of specs:

| Tier   | Project                                                       | Specs                                 | Auth needed?           |
| ------ | ------------------------------------------------------------- | ------------------------------------- | ---------------------- |
| Public | `public-chromium` (+ `public-firefox`, `public-webkit` local) | `login.spec.ts`, `middleware.spec.ts` | No                     |
| Authed | `authed-chromium`                                             | `onboarding.spec.ts` (more to come)   | Yes — Supabase session |

The authed tier depends on a one-shot `auth.setup.ts` that writes a signed-in storage state to `src/.auth/user.json`. Auth setup **skips entirely** when the four env vars below are absent, so the public tier still runs cleanly in CI without secret plumbing.

## Running locally

### One-time: create the e2e test user

This is a real Supabase user — create it once via the dashboard (Authentication → Users → Invite user) or via the existing `pnpm --filter @danieljoffe.com/wyrdfold invite-beta <email>` script (which also seeds the `wyrdfold_beta_invites` allowlist row so the `before-user-created` auth hook lets the row through). Pick something memorable like `e2e@wyrdfold.test`. No profile data required — specs that need data should seed it themselves.

The fixture authenticates by minting an OTP via `auth.admin.generateLink({type:'magiclink'})` and exchanging it via `verifyOtp` — same code path as a real user clicking the magic-link, but without the inbox round-trip.

### Per-machine: set the env

In `apps/wyrdfold/.env.local` (the dev server picks it up; Playwright inherits via `webServer.env`):

```bash
E2E_TEST_USER_EMAIL=e2e@wyrdfold.test
# Already in your .env.local for dev; the e2e fixture needs it too
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-from-supabase-dashboard>
```

The existing `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_ID` are already required for the dev server — Playwright reuses them.

### Run

```bash
# Run only the authed specs (auth setup chains in automatically)
pnpm nx e2e wyrdfold-e2e -- --project=authed-chromium

# Run only the public specs (no auth needed)
pnpm nx e2e wyrdfold-e2e -- --project=public-chromium

# Run everything (default)
pnpm nx e2e wyrdfold-e2e
```

## Running in CI

`.github/workflows/ci-full.yml` pipes `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_ID`, `SUPABASE_SERVICE_ROLE_KEY`, and `E2E_TEST_USER_EMAIL` into the e2e step. When all four secrets are populated in the repo settings, the authed tier runs; when any are missing, `auth.setup.ts` calls `setup.skip()` and the authed project's `dependencies: ['setup']` chain means no authed spec executes — the public tier still passes cleanly.

To enable the authed tier in CI:

1. Add `SUPABASE_SERVICE_ROLE_KEY` and `E2E_TEST_USER_EMAIL` to the GitHub Actions secrets (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_ID` are already there).
2. The test user account itself stays out of CI — same Supabase identity used locally, shared.

## Why OTP via service role (and not password sign-in)

The wyrdfold app's login UI is magic-link only (`signInWithOtp`). A password-sign-in fixture would diverge from the production auth path and only work if the test user happened to have a password set in addition to OTP, which is fragile.

`auth.admin.generateLink({type:'magiclink'})` returns the email OTP token without sending an email; `verifyOtp` then exchanges it for a real session. Same code path as a real user clicking the magic-link in their inbox. The trade-off is the service-role key in CI — broader scope than the anon key, but scoped to a parallel test identity that doesn't touch production users.

## Adding a new authed spec

1. Drop the new spec file at `src/<feature>.spec.ts`.
2. Add its filename to the `testMatch` regex of the `authed-chromium` project in `playwright.config.ts`.
3. The spec inherits the storageState — no per-spec setup needed.

If a spec needs deterministic data state (e.g., "user has no targets" or "user has exactly one resume_ready job"), wipe and seed inside the spec or via `apps/wyrdfold-api/scripts/wipe_user_data.py <user_id>` before the run.
