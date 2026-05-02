# Next.js API Routes — Wyrdfold Migration Audit

Issue: #590 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

`apps/root/src/app/api/` contains **76 route handlers** across 8
namespaces. They split cleanly into two cohorts:

- **Wyrdfold-bound (60)** — `career`, `jobs`, `targets`, `profile`,
  `tools`, plus the `email/job-alert` callback. These are BFF proxies
  to `apps/job-api` and need to be ported to the new app.
- **audit-tool–bound (16)** — `audit/*`, `leads/capture`,
  `email/contact`, `email/unsubscribe`. These stay on
  `apps/root` after Wyrdfold splits off.

The auth layer collapses to **three modes** (admin cookie, Supabase
session, shared secret). Everything else (Sentry, rate limiting,
proxy helpers) is already extracted into reusable modules — no
greenfield infrastructure needed for the Wyrdfold port.

## 1. Route inventory by namespace

```
namespace    | files | destination     | notes
-------------|-------|-----------------|--------------------------------
career/*     |   9   | wyrdfold        | thin proxies → job-api /experience/*
jobs/*       |  26   | wyrdfold        | thin proxies → job-api /jobs/*, /tailor/*
targets/*    |  16   | wyrdfold        | thin proxies → job-api /targets/*
profile/*    |   2   | wyrdfold        | proxies → job-api /user-profile/*
tools/*      |   3   | wyrdfold (auth) | login/logout/session — REWRITE for Supabase auth
email/job-alert |  1  | wyrdfold        | bearer-auth callback FROM job-api → user
audit/*      |  14   | apps/root       | scan + report + insights + admin
leads/capture |  1   | apps/root       | audit lead-magnet capture
email/contact |  1   | apps/root       | site contact form
email/unsubscribe + email/profile/unsubscribe + email/sequence | 3 | mixed | audit unsub stays; profile unsub goes with wyrdfold
```

Tested with `find apps/root/src/app/api -name 'route.ts'` → 76 files.
Test files (`route.test.ts`) co-located with each route — covered
in audit #594.

## 2. Auth model — three modes

### Mode A: admin session cookie (`adminSession`)

Used by: `tools/login`, `tools/logout`, `tools/session`, all
`/jobs/*`, `/career/*`, `/targets/*`, `/profile/*` (via `proxy.ts`
→ `verifyJobsAccess`).

- Cookie: `ADMIN_SESSION_COOKIE`, value is HS256 JWT signed with
  `ADMIN_SESSION_SECRET`.
- Issued by `tools/login` after constant-time compare against
  `TOOLS_ADMIN_PASSWORD` env var.
- Verified by `readAdminSession()` in `@/lib/adminSession`.
- `proxy.ts:verifyJobsAccess` accepts EITHER admin cookie OR a
  Supabase user session (Fitted magic-link flow exists but is
  currently unused by the deployed audit-tool admin).

**Wyrdfold action:** **Replace entirely with Supabase Auth.**

- Delete `tools/{login,logout,session}`.
- Replace cookie checks with `createAuthServerClient()` +
  `supabase.auth.getUser()` in every route.
- Replace `Bearer ${sessionToken}` upstream header with the
  Supabase user's JWT (job-api side: validate via Supabase JWKS
  rather than HS256). See #591 §6 for the corresponding job-api
  rewrite.

### Mode B: shared API key (`x-api-key`)

Used by: every BFF call to `apps/job-api` (header set in
`proxy.ts:proxyToFastAPI`), and by `apps/root/api/audit/scan`
calling `apps/audit-api/run-scan`.

- Env: `JOB_API_KEY`, `AUDIT_API_KEY`.
- Server-side only — never exposed to the browser.

**Wyrdfold action:** keep the pattern. Generate a fresh
`WYRDFOLD_API_KEY` for the new `wyrdfold-api` service.

### Mode C: shared-secret bearer for outbound webhooks

Used by: `email/job-alert` (called by `apps/job-api` poller when
new jobs match a target).

- Env: `JOB_ALERT_SECRET`.
- Header: `Authorization: Bearer <secret>`.
- Constant-time compare in the route handler.

**Wyrdfold action:** keep the pattern, rotate the secret for
the new app, update `wyrdfold-api` poller.

### Mode D: token-in-URL for unauth links

Used by: `email/unsubscribe`, `email/profile/unsubscribe`.

- HMAC-SHA256 of (lead_id, email) signed with
  `EMAIL_UNSUBSCRIBE_SECRET`.
- One-shot, no expiry — appropriate for unsub links.

**Wyrdfold action:** profile unsub moves with Wyrdfold (re-sign
with a Wyrdfold-side secret); audit-side unsub stays.

## 3. The BFF proxy pattern

`apps/root/src/app/api/jobs/proxy.ts` exports three helpers:

| Helper                    | Purpose                                                                 |
| ------------------------- | ----------------------------------------------------------------------- |
| `proxyToFastAPI`          | Default JSON proxy. Forwards body, returns JSON or binary. 30s timeout. |
| `proxyStreamingToFastAPI` | SSE/stream pass-through (used by `career/experience/derive/stream`).    |
| `proxyMultipartToFastAPI` | File upload pass-through (used by `career/experience/upload-resume`).   |

All three:

- Inject `x-api-key` from `JOB_API_KEY`
- Inject `Authorization: Bearer <admin-session-token>` if cookie
  present
- Use `AbortController` for timeout enforcement
- Forward upstream status codes verbatim

**Wyrdfold action:** copy `proxy.ts` to `apps/wyrdfold/src/lib/`
and rename helpers (`proxyToWyrdfoldAPI`). Keep the streaming and
multipart variants — both are used.

## 4. Sentry instrumentation

Every Wyrdfold-bound route wraps its handler in
`captureApiError` from `@/lib/errorTracking`. Pattern:

```ts
try {
  // ... proxy call ...
} catch (err) {
  captureApiError(err, { route: 'jobs/poll', method: 'POST' });
  return NextResponse.json({ error: 'upstream' }, { status: 502 });
}
```

This is the **standard** for the codebase — port verbatim. Sentry
DSN comes from `NEXT_PUBLIC_SENTRY_DSN` (server-side) and
`SENTRY_AUTH_TOKEN` (build).

## 5. Rate limiting

- `tools/login`: in-memory rate limit on the route file (5 attempts
  / 15 min). Acceptable because admin-only.
- `email/contact`: same in-memory limiter (3 / 5 min).
- `leads/capture`: bot detection via `botid/server` (Vercel Bot ID)
  - Supabase RLS-protected insert.
- Other routes: rely on Vercel platform rate limits.

**Wyrdfold action:** for the public Wyrdfold sign-up flow, add
proper rate limiting (Upstash Ratelimit or Vercel KV) — the
in-memory limiter does not survive serverless cold starts.

## 6. Env vars consumed by the API layer

```
NEXT_PUBLIC_SUPABASE_URL              # all Supabase routes
NEXT_PUBLIC_SUPABASE_ANON_KEY         # browser auth
SUPABASE_SERVICE_ROLE_KEY             # server inserts (leads/capture)
JOB_API_URL                           # BFF target
JOB_API_KEY                           # BFF auth
ADMIN_SESSION_SECRET                  # JWT signing
ADMIN_SESSION_COOKIE_NAME             # cookie name override
TOOLS_ADMIN_PASSWORD                  # admin login
JOB_ALERT_SECRET                      # webhook auth
EMAIL_UNSUBSCRIBE_SECRET              # unsub-link HMAC
RESEND_API_KEY                        # transactional email
RESEND_FROM_EMAIL                     # sender address
AUDIT_API_URL / AUDIT_API_KEY         # audit-tool only
NEXT_APP_URL                          # absolute URL builder
SENTRY_DSN / SENTRY_AUTH_TOKEN        # observability
```

For Wyrdfold split:

- Keep all `NEXT_PUBLIC_*` (will point to a Wyrdfold Supabase project)
- Rename `JOB_API_*` → `WYRDFOLD_API_*`
- Drop `ADMIN_SESSION_*` and `TOOLS_ADMIN_PASSWORD` (Supabase auth replaces)
- Rotate `JOB_ALERT_SECRET` and `EMAIL_UNSUBSCRIBE_SECRET`

## 7. /fitted coupling

Grep across `apps/root/src/app/api/` for `fitted`:

```
proxy.ts:11 "Fitted app via magic link"   ← comment only
career/.../upload-resume:N "/fitted/..."  ← redirect after upload (1 hit)
```

The API layer is **almost completely path-agnostic** — only one
hardcoded `/fitted/` redirect (in `upload-resume`). This rewrites
to `/` (or wyrdfold app root) trivially.

## 8. What stays on apps/root

After Wyrdfold splits, these routes remain:

- `audit/*` (14) — Lighthouse/axe scans, leads, admin
- `leads/capture` (1) — audit-tool email-capture
- `email/contact` (1) — site contact form
- `email/unsubscribe` (1) — audit lead-list unsub
- `email/sequence` (1) — audit-tool drip campaign
- `tools/*` (3) — DELETE these once Wyrdfold migrates auth.
  audit-admin doesn't use them (audit admin is Supabase-gated
  via `(audit)/dashboard` route group).

**Confirmed**: no `audit/*` route depends on `JOB_API_*` or
`ADMIN_SESSION_*` envs. The split is clean.

## 9. Wyrdfold port checklist

- [ ] Scaffold `apps/wyrdfold/src/app/api/` matching the namespace
      layout for `career`, `jobs`, `targets`, `profile`, `email`
- [ ] Copy `proxy.ts` → `wyrdfold/src/lib/proxy.ts`, rename helpers
      and env vars
- [ ] Replace `verifyJobsAccess` with a single
      `verifyWyrdfoldUser()` that uses `createAuthServerClient` + `supabase.auth.getUser()`
- [ ] Delete `tools/{login,logout,session}`; replace UI auth with
      Supabase magic-link or password
- [ ] Port `email/job-alert` (rotate `JOB_ALERT_SECRET` →
      `WYRDFOLD_ALERT_SECRET`)
- [ ] Port `email/profile/unsubscribe` (rotate `EMAIL_UNSUBSCRIBE_SECRET`
      → `WYRDFOLD_UNSUB_SECRET`)
- [ ] Wire Sentry: copy `errorTracking.ts`, set new DSN
- [ ] Add Upstash/KV-backed rate limit for any public sign-up endpoint
- [ ] E2E test: Supabase auth flow + protected proxy round-trip

## 10. Open questions

1. **Resend domain verification.** Wyrdfold needs its own
   verified `from:` address (e.g., `noreply@wyrdfold.com`) or it
   inherits danieljoffe.com's domain. Decision affects DNS.
2. **Sentry project split.** Single project with `app: wyrdfold`
   tag, or separate Sentry project? Single = cheaper, dual =
   cleaner alert routing.
3. **Streaming proxy CORS / EventSource on edge runtime.**
   `proxyStreamingToFastAPI` currently runs on Node runtime.
   Wyrdfold can keep that or move to edge (lower TTFB) if
   `apps/wyrdfold-api` is also deployed close to the edge.

## 11. Decision summary

| Question                       | Answer                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------- |
| How many routes to port?       | 60 (career, jobs, targets, profile, job-alert)                                              |
| How many stay on apps/root?    | 16 (audit, leads, contact, unsub, sequence)                                                 |
| Is the proxy pattern reusable? | Yes — copy `proxy.ts` and rename                                                            |
| Auth rewrite scope?            | Replace adminSession with Supabase auth — affects every Wyrdfold-bound route's verify call  |
| New env vars for Wyrdfold?     | `WYRDFOLD_API_*`, `WYRDFOLD_ALERT_SECRET`, `WYRDFOLD_UNSUB_SECRET`; drop admin-session vars |
| Sentry strategy?               | Reuse `captureApiError` verbatim, new DSN                                                   |

## 12. Collisions

The other session is editing `apps/job-api/`, not `apps/root/`.
**No overlap** with the API routes audit. This audit modifies
docs only.
