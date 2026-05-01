# Platform Readiness — Wyrdfold Migration Audit

Issue: #595 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

The platform foundation (CSP, Sentry, security headers,
caching, env hygiene) is **solid and ports as-is**. Three
items need attention before the Wyrdfold cut:

1. **PII masking gap on Settings** — identity inputs (name,
   email, phone, location, LinkedIn, website) are missing
   `data-sentry-mask`. Confirmed: only `tools/login`,
   `fitted/login`, and the public contact form pass it.
2. **No rate limiting on Fitted BFF routes** — the existing
   pattern (`audit/*` + `email/contact` + `tools/login` use
   `lib/rateLimit.ts`) is not applied to `/api/jobs/*` or
   `/api/career/experience/*`. Auth gates them, but a logged-in
   user can hammer LLM endpoints.
3. **CSP `script-src https:` is broad** — comes from
   `'strict-dynamic'` permissions but worth narrowing for
   Wyrdfold if the design doesn't load 3rd-party scripts.

Everything else (HSTS, COOP, Permissions-Policy, security
headers, cache-control, observability, bot detection) is
production-grade.

## 1. Environment variables

### Server-only (must remain server-side)

| Var                                   | Purpose                          | Notes                            |
| ------------------------------------- | -------------------------------- | -------------------------------- |
| `JOB_API_URL`                         | FastAPI backend base URL         | proxy.ts                         |
| `JOB_API_KEY`                         | shared key for BFF→FastAPI calls | proxy.ts                         |
| `ADMIN_SESSION_SECRET`                | HS256 JWT secret for tools-admin | enforced ≥32 chars               |
| `TOOLS_ADMIN_PASSWORD`                | tools-admin login                | hashed/compared in route handler |
| `SUPABASE_SERVICE_ROLE_KEY` (if used) | server-side Supabase ops         | not surfaced in this scan        |

### Public (NEXT*PUBLIC*\*)

| Var                               | Purpose              |
| --------------------------------- | -------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_ID`    | Supabase anon key    |
| `NEXT_PUBLIC_GOOGLE_ANALYTICS_ID` | GA4 tracking         |
| `NEXT_PUBLIC_HCAPTCHA_SITE_ID`    | hCaptcha public key  |
| `NEXT_PUBLIC_SENTRY_CONFIG_ID`    | Sentry DSN           |
| `NEXT_PUBLIC_NODE_ENV`            | environment label    |

### Build/Runtime flags

`NODE_ENV`, `CI`, `VERCEL`, `VERCEL_URL`, `MOCK_FONTS`,
`ANALYZE`, `NEXT_RUNTIME`.

### Wyrdfold migration

- **All vars port verbatim** — Wyrdfold needs its own values
  but identical names work
- **`.env.example`** must be regenerated for the brand (the
  current one is in the repo at `apps/root/.env.example`)
- **No env-var renames suggested** — drift between repos
  becomes an ops headache fast

## 2. Security headers (`next.config.mjs`)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
Cross-Origin-Opener-Policy: same-origin    (prod only)
Referrer-Policy: origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-Powered-By: (suppressed)
X-DNS-Prefetch-Control: on
```

All ports as-is. Skipping COOP in dev is intentional (browsers
ignore it on non-trustworthy origins → console noise).

## 3. CSP (built in middleware `proxy.ts`)

```
default-src 'self';
script-src 'self' 'nonce-{nonce}' 'strict-dynamic' https: [unsafe-eval in dev];
style-src 'self' 'unsafe-inline';
font-src 'self' https: data:;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-src {hcaptcha} {hcaptcha-assets} {storybook} {calendly};
frame-ancestors 'none';
upgrade-insecure-requests; (HTTPS only)
connect-src 'self' {allowedOrigins};
img-src 'self' blob: data: {allowedImageOrigins};
```

### Observations

- **`script-src https:`** — fallback for `'strict-dynamic'`
  on browsers that don't honor it. Could narrow if Wyrdfold
  doesn't load 3rd-party scripts. Today it allows
  GA + hCaptcha + Calendly + Sentry tunnel.
- **`style-src 'unsafe-inline'`** — required by Tailwind
  CSS-in-JS / Next.js style injection. Standard practice.
- **`frame-src` allowlist** — hCaptcha + Storybook + Calendly.
  Wyrdfold likely doesn't need Storybook in production CSP;
  remove for tightening.
- **No CSP report-uri** — consider adding `report-to` /
  `report-uri` for Wyrdfold if security tracking matters.

### Migration

The builder is in `apps/root/src/proxy.ts` (audited in #588).
Port verbatim, then prune frame-src allowlist for Wyrdfold's
actual integrations.

## 4. PII / Sensitive data

`data-sentry-mask` is currently applied on:

- `apps/root/src/app/tools/login/LoginForm.tsx` ✓
- `apps/root/src/app/fitted/login/MagicLinkForm.tsx` ✓
- `apps/root/src/app/(public)/about/Contact/Form.tsx` ✓

**Missing** (identified in #587 + #588 audits):

- `apps/root/src/app/fitted/(app)/settings/SettingsPage.tsx` —
  6 identity inputs (name, email, phone, location,
  linkedin_url, website_url)
- `apps/root/src/app/fitted/(app)/profile/ProfilePage.tsx` —
  master document `<textarea>` (free text; can contain PII)
- `apps/root/src/app/fitted/_components/ConversationChat*.tsx`
  — chat input

### Sentry replay implications

`replaysSessionSampleRate: isProduction() ? 0.1 : 0` means
**10% of production sessions are recorded as Replays**. Without
masking on identity inputs, those replays leak PII into Sentry.

**Action before migration:** add `data-sentry-mask` to the
6 Settings identity inputs + Profile textarea + ConversationChat
input. Easy fix; one-line per element.

> Note: shared-ui `<Input>` and `<Textarea>` need to forward
> `data-*` attrs for this to work (verify in the shared-ui
> source). If they don't, the fix is in shared-ui, not the app.

## 5. Rate limiting

### Currently rate-limited

| Route                       | Limiter source                  |
| --------------------------- | ------------------------------- |
| `/api/audit/insights/*` (5) | `audit/insights/rateLimit.ts`   |
| `/api/audit/admin/*`        | `audit/admin/rateLimit.ts`      |
| `/api/audit/scan`           | inline `lib/rateLimit.ts` usage |
| `/api/email/contact`        | `email/contact/helpers.ts`      |
| `/api/tools/login`          | inline `lib/rateLimit.ts` usage |

### NOT rate-limited (gap)

| Route group                            | Risk                                  |
| -------------------------------------- | ------------------------------------- |
| `/api/jobs/*`                          | A logged-in user can poll listings    |
| `/api/jobs/[id]/tailor`                | **LLM cost** — Anthropic on every hit |
| `/api/career/experience/derive/stream` | **LLM cost** — streaming derive       |
| `/api/career/experience/upload-resume` | File upload abuse + LLM cost          |
| `/api/profile/*`                       | PATCH spam (low cost)                 |

Auth gates these (Supabase session required), but **session
auth ≠ rate limit**. A single legitimate user can rack up
LLM bills via repeated derive/tailor calls.

### Recommendation

Pre-Wyrdfold: add a per-user rate limit on the LLM-touching
routes (`/api/jobs/[id]/tailor`,
`/api/career/experience/derive/stream`, upload-resume) keyed
by Supabase user_id (not IP — multiple users behind one IP).
Pattern already exists in `lib/rateLimit.ts` — extend the
key strategy to accept user_id.

Defensive backstop: job-api itself should have its own
LLM-cost guards (token budgets per user/day). Track in
job-api ADR.

## 6. Caching

```
/_next/static/*    → max-age=31536000, immutable
/_next/image       → max-age=86400, stale-while-revalidate=604800
/images/*          → max-age=31536000, immutable
favicon/sitemap/robots → max-age=86400, swr=604800
/api/*             → private, no-cache, must-revalidate
HTML pages         → max-age=0, must-revalidate (bfcache)
```

Notes:

- `must-revalidate` instead of `no-store` on HTML preserves
  bfcache (back/forward navigation stays instant). Standard
  modern practice.
- API responses are `private, no-cache, must-revalidate` —
  prevents intermediate caches from serving stale auth-gated
  content.
- Image cache TTL 30 days minimum at the Next.js layer
  (`minimumCacheTTL`).

Ports as-is.

## 7. Performance configuration

| Setting                               | Value                             |
| ------------------------------------- | --------------------------------- |
| `compress`                            | `true`                            |
| `poweredByHeader`                     | `false`                           |
| `productionBrowserSourceMaps`         | `false` (uploaded to Sentry only) |
| `experimental.optimizePackageImports` | `['yup', 'schema-dts']`           |
| `webpackBuildWorker`                  | `true` (off in test/CI)           |
| `images.formats`                      | `['image/webp', 'image/avif']`    |
| `images.deviceSizes`                  | `[640, 768, 1024, 1280]`          |
| `images.imageSizes`                   | `[16, 32, 48, 64, 256, 400]`      |
| Bundle analyzer (`ANALYZE=true`)      | wired via `@next/bundle-analyzer` |

### Wyrdfold considerations

- **Recharts lazy-loaded** via `dynamic({ssr: false})` in
  Insights (audited in #586). Preserve this pattern.
- **GSAP** is the heaviest non-Recharts dep (used on public
  site, not Fitted). If Wyrdfold doesn't use GSAP, drop it.
- **`optimizePackageImports`** — extend with Pyre-specific
  packages if applicable (e.g., if a chartreuse-themed icon
  set ships).
- **OG image bundling** (`outputFileTracingIncludes`) is
  hardcoded to `/about`, `/experience`, `/projects`,
  `/services`, `/audit` — **purge for Wyrdfold** since those
  routes go away. Keep only Wyrdfold's actual OG routes.

## 8. Sentry configuration

```
client:  10% trace sampling (prod), 100% (dev)
client:  10% replay session sampling (prod), 100% on error
sample rate: 100% errors
tunnelRoute: /monitoring  (avoids ad-blockers)
widenClientFileUpload: true (more source maps)
automaticVercelMonitors: true (cron monitors)
```

Files:

- `src/sentry.server.config.ts`
- `src/sentry.edge.config.ts`
- `src/instrumentation-client.ts`
- `src/instrumentation.ts`
- `src/lib/sentry.config.ts` (env gate via `sentryEnabled`)
- `src/lib/errorTracking.ts` (`captureApiError` helper used
  in BFF routes)

### Wyrdfold migration

- **Create a separate Sentry project** for Wyrdfold (don't
  share the danieljoffe.com project — issue noise + quota
  attribution)
- Update `org` + `project` in `next.config.mjs`'s
  `withSentryConfig` block
- Tunnel route `/monitoring` ports as-is

## 9. Observability gaps

- **No structured request logging** beyond Sentry breadcrumbs
  (intentional — Vercel logs are the primary source)
- **No metrics export** (no OpenTelemetry, no Prometheus —
  fine for the scale)
- **No uptime monitoring** mentioned in repo (probably set up
  in Vercel separately)
- **Vercel Cron Monitors** are auto-instrumented for any
  cron jobs

For Wyrdfold: same posture is fine. Add cron monitors as
needed.

## 10. Bot detection

`botid` package (Vercel's offering) is wired in `next.config.mjs`
via `withBotId(finalConfig)` and initialized client-side via
`initBotId()` in `instrumentation-client.ts`. Used to
distinguish bot traffic for analytics + Sentry + abuse
prevention.

Ports as-is. Wyrdfold benefits identically.

## 11. Analytics

- GA4 (`NEXT_PUBLIC_GOOGLE_ANALYTICS_ID`) — page views,
  events
- `apps/root/src/lib/analytics.ts` defines event helpers
  (referenced in audit funnel work)

For Wyrdfold:

- Use a separate GA4 property (or a separate GTM container)
- Audit any hardcoded event labels referencing "fitted" /
  "danieljoffe" / "audit" — none should leak into Wyrdfold's
  analytics

## 12. Build & deploy

- **Vercel** is the host (`VERCEL_URL` env var, source maps
  uploaded to Sentry post-build)
- **Nx Cloud** for distributed cache + CI orchestration
  (referenced in `.claude/skills/monitor-ci.md`)
- **Pre-commit hooks**: lint-staged → ESLint → Prettier →
  full typecheck
- **`pnpm pom`**: typecheck → lint → format → test →
  coverage → e2e → Lighthouse (full quality gate)

For Wyrdfold:

- Keep Vercel
- Spin up a separate Nx Cloud workspace ID (or share — TBD
  by ops preference)
- `pom` script structure ports verbatim

## 13. Lighthouse / Core Web Vitals

`pom` runs Lighthouse as the final gate. Implementation in
`apps/audit-api/` (the dogfood audit tool — public-site
homepage scored daily). Scores cited in past PRs hold steady
in the 90s on the public site.

For Wyrdfold:

- Run a baseline Lighthouse on the staging deploy before
  cutover
- Set perf budgets (`mcp__lighthouse__check_performance_budget`)
  for the Fitted-equivalent routes once theme work lands
- Pyre theme palette tuning for Recharts (audited in #586)
  could affect contrast scores — verify with a11y axe sweep
  post-theme-port

## 14. Module boundaries (Nx)

`@nx/enforce-module-boundaries` is configured in ESLint:

- `apps/root` ↔ `libs/shared/ui` allowed
- `apps/root` ↔ `libs/shared/audit` allowed
- `apps/root` ↛ `apps/audit-api` / `apps/job-api` (Python,
  no JS imports across the language boundary)
- Circular imports detected as errors (`import/no-cycle`)

For Wyrdfold: the new app directory inherits this same enforce
config. No changes needed.

## 15. ESLint custom rules

Custom rules ship with the repo (`tools/eslint-rules/` per
the workspace structure):

- `require-button-name` — `<Button>` must have `name` prop
  (analytics tagging)
- `no-raw-headings` — `<h1>`–`<h6>` must use Heading
  component from kit/shared-ui

These ports verbatim. Heading enforcement matters more during
the port (lots of new components).

## 16. Pre-migration checklist

### Must-do

- [ ] **Add `data-sentry-mask`** to 6 Settings identity inputs
- [ ] **Add `data-sentry-mask`** to Profile master document
      textarea + ConversationChat input
- [ ] **Verify shared-ui `<Input>` and `<Textarea>` forward
      `data-*` attrs** (likely they do; confirm)
- [ ] **Add per-user rate limits** on
      `/api/jobs/[id]/tailor`,
      `/api/career/experience/derive/stream`, and
      `upload-resume`
- [ ] **Create separate Sentry project** for Wyrdfold; update
      `next.config.mjs` org/project
- [ ] **Purge OG `outputFileTracingIncludes`** of routes that
      don't exist in Wyrdfold
- [ ] **Regenerate `.env.example`** for Wyrdfold

### Should-do

- [ ] Narrow CSP `script-src` if Wyrdfold doesn't need broad
      `https:` fallback
- [ ] Prune `frame-src` allowlist (drop Storybook in prod
      CSP)
- [ ] Set up CSP `report-to` for production telemetry
- [ ] Add per-user job-api token-budget guard (defense in
      depth on LLM cost)

### Defer

- [ ] Switch to OTel for distributed tracing (out of scope)
- [ ] Add Prometheus metrics export (out of scope)
- [ ] Visual-regression Playwright snapshots for Pyre theme
      (do post-theme-port)

## 17. Decision summary

| Concern             | Status                                            | Wyrdfold action                            |
| ------------------- | ------------------------------------------------- | ------------------------------------------ |
| Env vars            | clean separation                                  | Regenerate `.env.example`; identical names |
| Security headers    | production-grade                                  | Port verbatim                              |
| CSP                 | nonce + strict-dynamic, broad `script-src https:` | Port; consider narrowing                   |
| PII masking         | gap on Settings + Profile                         | Add `data-sentry-mask` before cutover      |
| Rate limiting       | gap on LLM routes                                 | Add per-user limits before cutover         |
| Caching             | bfcache-friendly, immutable assets                | Port verbatim                              |
| Sentry              | client+server+edge, replay                        | New Sentry project; update config          |
| Bot detection       | botid wired                                       | Port verbatim                              |
| Analytics           | GA4                                               | New GA property; purge hardcoded labels    |
| Build perf          | webpackBuildWorker, optimizePackageImports        | Extend for Pyre packages                   |
| Module boundaries   | Nx-enforced                                       | Inherits automatically                     |
| Custom ESLint rules | name-prop, no-raw-headings                        | Port verbatim                              |

## 18. Collisions

Other session is editing `apps/job-api/`. **No overlap** with
this audit (docs only).
