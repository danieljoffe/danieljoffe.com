# WyrdFold Frontend (BFF) — Performance & Security Analysis

Companion to issue #850 (which covers `wyrdfold-api`). Scope: `apps/wyrdfold/` —
Next.js 16 App Router app whose `src/app/api/**/route.ts` handlers authenticate via
Supabase and proxy to the FastAPI service. ~70 route handlers, no top-level middleware
auth (handled by `src/lib/api/proxy.ts` + middleware token refresh).

## Verdict

The frontend is in **good shape** and notably stronger than the API on its own
boundary: every route funnels through shared proxy helpers that require a session
before any upstream call, CSP/HSTS/COOP headers are set, open-redirect is guarded,
no service-role key in the app, charts are lazy-loaded, RSC pages fan out with
`Promise.all`. Findings below are defense-in-depth + targeted perf, no exploitable HIGH.

---

## Security

### MEDIUM

- **M1 — `getSession()` server-side instead of `getUser()`** · `src/lib/api/proxy.ts:25`
  `getAccessToken()` reads the JWT from cookie without verifying its signature. Every
  proxy helper gates its 401 on this. Mitigated by middleware `getUser()` refresh +
  API re-validation, but the BFF still trusts an unverified token for its early return.
  _Fix:_ call `getUser()` and only return the token if it resolves a user.
- **M2 — Unguarded `await request.json()`** · `jobs/manual/route.ts:6`, `targets/from-url/route.ts:6`,
  `jobs/[id]/status/route.ts`, ~20 others. Malformed/empty body → unhandled rejection → 500
  (potential stack leak) instead of a clean 400. No body-shape validation in the BFF.
  _Fix:_ wrap in try/catch → 400; optionally a thin zod shape check (API owns full schema).

### LOW

- **L1 — `targets/from-url` forwards arbitrary user URL** to API with no allowlist
  (`from-url/route.ts:7`). BFF does not fetch it (no SSRF here); SSRF defense correctly
  lives in the API. Documenting the boundary only.
- **L2 — Dev-mode error detail** in `proxy.ts:108-118,126-131` (`err.message`, upstream body
  preview) gated on `NODE_ENV !== 'production'`. Confirm `NODE_ENV=production` on Vercel.

### Confirmed good

Open redirect guarded (`auth/callback/route.ts:37-41` `safeNext`, `proxy.ts:16-21`);
CSP w/ per-request nonce + `strict-dynamic` + `frame-ancestors 'none'` (`proxy.ts:23-43`,
`next.config.mjs:58-80`); `CRON_SECRET` compared with `timingSafeEqual` (`jobs/poll/route.ts:6-11`);
anon key only, correct `@supabase/ssr` cookie pattern.

---

## Performance

### MEDIUM

- **P-1 — Insights fetched client-side, not streamed** · `InsightsDashboard.tsx:148-150`,
  `hooks/useInsights.ts:169-266`. Three datasets fetch after hydration → extra
  client→Next→API round-trip, each re-resolving the session. Dashboard/jobs/targets pages
  already fetch server-side. _Fix:_ fetch the three endpoints in server `page.tsx` with
  `Promise.all`, pass as `initial` props (mirror `DashboardInitial`); keep the hook for
  period re-fetches.
- **P-2 — Insights charts re-render on unrelated slice updates** ·
  `InsightsDashboard.tsx:291,306,319,343,361,381,404`. Fresh `?? []` fallbacks + 3 independent
  `setState` resolutions re-render all (expensive) Recharts. _Fix:_ memoize per-chart arrays /
  `React.memo` the charts.

### LOW

- **P-3 — Dashboard counts = 7 round-trips** · `dashboard/page.tsx:59-77` issues 7
  `JobsListResponse` calls with `page_size:'1'` just to read `.total` (highest-fanout page).
  _Fix:_ add upstream `/jobs/pipeline-counts` projection returning `{status: count}`.
- **P-4 — `JobsList` status poll never backs off** · `JobsList.tsx:238` `setInterval`@3s clears
  only on `ready`/`error`; a target stuck `deriving` polls at 3s forever.
  _Fix:_ max-attempts cap / backoff (mirror `TargetsList` `DERIVE_POLL_MAX_ATTEMPTS`).
- **P-5 — `JobsList` batch poll overlaps** · `JobsList.tsx:390-431` `setInterval` fires async
  every 3s without awaiting the prior. _Fix:_ chained-`setTimeout` no-overlap pattern
  (`TargetsList.tsx:213-217`).

### Notes

Verify root `layout.tsx` uses `next/font` w/ `display:'swap'`. `cache:'no-store'` on authed
reads (`proxy.ts:80`) is correct. No GSAP in this app.

---

## Suggested order

1. M1 (getUser) + M2 (json guard) — small, broad blast radius.
2. P-1 + P-2 — biggest UX win (insights page).
3. P-4/P-5 polling hygiene; P-3 needs an upstream endpoint.
