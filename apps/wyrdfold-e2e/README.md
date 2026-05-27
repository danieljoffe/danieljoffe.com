# wyrdfold-e2e

Playwright suite for the wyrdfold app. Two tiers of specs:

| Tier   | Project                                                       | Specs                                 | Auth needed?           |
| ------ | ------------------------------------------------------------- | ------------------------------------- | ---------------------- |
| Public | `public-chromium` (+ `public-firefox`, `public-webkit` local) | `login.spec.ts`, `middleware.spec.ts` | No                     |
| Authed | `authed-chromium`                                             | `onboarding.spec.ts` (more to come)   | Yes — Supabase session |

The authed tier depends on a one-shot `auth.setup.ts` that writes a signed-in storage state to `src/.auth/user.json`. Auth setup **skips entirely** when the four env vars below are absent, so the public tier still runs cleanly in CI without secret plumbing.

## Running locally

### One-time: create the e2e test user

This is a real Supabase user — create it once via the dashboard (Authentication → Users → Invite user with password) or via the CLI. Pick something memorable like `e2e@wyrdfold.test`. The user just needs to exist with a known password; no profile data required (specs that need data should seed it themselves).

### Per-machine: set the env

In `apps/wyrdfold/.env.local` (the dev server picks it up; Playwright inherits via `webServer.env`):

```bash
E2E_TEST_USER_EMAIL=e2e@wyrdfold.test
E2E_TEST_USER_PASSWORD=<the-password-you-set>
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

CI currently runs only the **public** tier — `auth.setup.ts` calls `setup.skip()` when the `E2E_TEST_USER_*` vars are missing, and the authed project's `dependencies: ['setup']` chain means no authed spec executes.

To enable the authed tier in CI:

1. Add `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` to the GitHub Actions secrets (e.g. via the `secrets.E2E_TEST_USER_EMAIL` mapping in `.github/workflows/ci.yml`).
2. Make sure the CI job also has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_ID` — without them the dev server proxy hard-401s on every API call.
3. The test user account itself stays out of CI — same one, shared.

## Why password sign-in (and not magic-link)

The wyrdfold app uses magic-link auth in production. The Playwright setup uses Supabase password sign-in because magic-link requires either an inbox (slow + flaky) or the `auth.admin.generateLink` endpoint (needs the service-role key, which is a much bigger secret-surface to ship to CI). Password sign-in stays scoped to the anon key.

The test user is a parallel Supabase identity — it doesn't change anything about how production users authenticate.

## Adding a new authed spec

1. Drop the new spec file at `src/<feature>.spec.ts`.
2. Add its filename to the `testMatch` regex of the `authed-chromium` project in `playwright.config.ts`.
3. The spec inherits the storageState — no per-spec setup needed.

If a spec needs deterministic data state (e.g., "user has no targets" or "user has exactly one resume_ready job"), wipe and seed inside the spec or via `apps/wyrdfold-api/scripts/wipe_user_data.py <user_id>` before the run.
