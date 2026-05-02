# Sentry

## What it does in this app

Error tracking + APM across all three apps:

- **`apps/root` (Next.js)** — client + server error capture, Replay, performance traces. Toggled by `NEXT_PUBLIC_SENTRY_CONFIG_ID` (the DSN); empty value disables Sentry entirely so dev doesn't ship noise.
- **`apps/audit-api` (FastAPI)** — captures unhandled scan errors. `SENTRY_DSN` empty = disabled.
- **`apps/job-api` (FastAPI)** — currently no Sentry SDK wired (verify in `apps/job-api/app/main.py` if this changes). Errors surface in Railway logs only.

PII-bearing form fields use `data-sentry-mask` so values don't end up in Replay recordings.

## Get keys

1. Sign in at https://sentry.io
2. **Settings → Projects** → **Create Project**
   - Platform: **Next.js** for `root`, **Python** for `audit-api`/`job-api`
   - Name: `danieljoffe-root` / `danieljoffe-audit-api` / `danieljoffe-job-api`
3. After creation, **Settings → SDK Setup → Client Keys (DSN)** → copy the DSN
4. For source-map uploads (Next.js prod builds), **Settings → Auth Tokens** → **Create New Token** with `project:releases` + `org:read` scopes

The DSN is **not secret** — it's safe in client bundles. The auth token **is** secret — Vercel/Railway env only.

## Env vars

**Frontend** (`apps/root/.env.local`):

```env
NEXT_PUBLIC_SENTRY_CONFIG_ID=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_AUTH_TOKEN=sntrys_...     # build-time only, for source map upload
SENTRY_ORG=danieljoffe
SENTRY_PROJECT=danieljoffe-root
```

Leave `NEXT_PUBLIC_SENTRY_CONFIG_ID` empty in dev unless you actively want events flowing — `sentryEnabled` short-circuits when it's missing.

**audit-api** (`apps/audit-api/.env`):

```env
SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project>
SENTRY_ENVIRONMENT=development      # or production
SENTRY_TRACES_SAMPLE_RATE=0.1       # 10% trace sampling; tune per cost
```

## Validate the keys

Frontend (after starting `pnpm nx dev root`):

```js
// in browser dev tools
Sentry.captureMessage('smoke test from local dev');
```

Then check Sentry → Issues — should appear within ~30s.

audit-api smoke:

```python
import sentry_sdk
sentry_sdk.init(dsn="<DSN>")
sentry_sdk.capture_message("audit-api smoke test")
```

Or just trigger any 500 (e.g., POST a malformed scan request) and watch Issues.

Source maps for prod: after `pnpm nx build root`, look at the build log for `Sentry CLI: 12 source maps uploaded`. Missing = `SENTRY_AUTH_TOKEN` / org / project mismatch.

## Cost / billing dashboard

- Usage + plan: https://sentry.io/settings/billing/
- Free tier: 5K errors, 10K performance units, 50 replays/month
- The traces sample rate dial (`SENTRY_TRACES_SAMPLE_RATE`) is the biggest cost lever — 0.1 = keep 10%, 1.0 = keep all

## Where it's wired

- Frontend client init: `apps/root/src/instrumentation-client.ts:13`
- Frontend server config: `apps/root/src/lib/sentry.config.ts:9`
- Public env passthrough: `apps/root/src/lib/public.env.ts:4`
- audit-api init: `apps/audit-api/app/observability.py` (search for `sentry_sdk.init`)
- audit-api config: `apps/audit-api/app/config.py:11`
- PII masking attribute: search `data-sentry-mask` across `apps/root/src/`

## Common errors

| Symptom                                       | Cause                                              | Fix                                                                      |
| --------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| Events not showing up in dev                  | `NEXT_PUBLIC_SENTRY_CONFIG_ID` empty (intentional) | set the DSN locally if you actually want dev events                      |
| `Sentry CLI: failed to upload …` during build | missing/wrong `SENTRY_AUTH_TOKEN` or org/project   | regenerate token with `project:releases` scope; verify org/project slugs |
| Stack traces show minified names in prod      | source maps not uploaded                           | check build log; ensure `SENTRY_AUTH_TOKEN` is set in Vercel prod env    |
| Replay shows raw email/password values        | input missing `data-sentry-mask`                   | add the attribute to all PII inputs (see coding-conventions.md)          |
| Hitting free-tier quota mid-month             | trace sample rate too high or noisy console error  | drop `SENTRY_TRACES_SAMPLE_RATE`; add `ignoreErrors` for the noise       |
| audit-api errors not arriving                 | `SENTRY_DSN` empty in Railway                      | set in Settings → Variables; redeploy                                    |
