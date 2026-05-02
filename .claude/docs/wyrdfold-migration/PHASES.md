# WyrdFold Migration — Phased Execution Plan

Companion to the 12 audit docs in this directory. The audits map
the work; this file orders it.

**App name:** `apps/wyrdfold/` (rebrand to WyrdFold + Pyre theme).
**Base branch for the migration umbrella:** `feature/fitted` —
the `/fitted` feature does not exist in `develop` or `main`, so all
migration work must base on this branch and merge back into it
before `feature/fitted` itself merges down.

## Phase 0 — Pre-port hardening (on apps/root, before the cut)

Audit doc: `platform-readiness.md` §16, `test-coverage.md` §9 steps 1–3.

The fitted code carries security gaps that must not ride into
WyrdFold. Land these on `feature/fitted` so they're inherited at
port time.

- [ ] Add `data-sentry-mask` to Settings identity inputs (name,
      email, phone, location, linkedin_url, website_url).
- [ ] Add `data-sentry-mask` to Profile master-document `<textarea>`.
- [ ] Add `data-sentry-mask` to `_components/ConversationChat*.tsx`
      input.
- [ ] Verify shared-ui `<Input>` and `<Textarea>` forward `data-*`
      attrs. If not, fix in shared-ui first.
- [ ] Add per-user rate limits (Supabase user_id keyed) on
      `/api/jobs/[id]/tailor`,
      `/api/career/experience/derive/stream`, and
      `/api/career/experience/upload-resume`.
- [ ] Tier 1 unit tests: profile/types, scoring profile, gap-health
      (test-coverage.md §5 Tier 1).

**Done when:** Sentry replays no longer leak PII on those forms;
rate-limit tests pass; Tier 1 specs land green.

## Phase 1 — Workspace foundation (scaffold WyrdFold)

Audit doc: `shared-ui.md`, `platform-readiness.md` §1–§8.

- [ ] Add `pyre-theme.css` sibling to `theme.css` in shared-ui
      (chartreuse on near-black; see `shared-ui.md` §4 for the
      token map).
- [ ] Drop `DarkModeToggle` usage from WyrdFold layout (Pyre is
      single-theme).
- [ ] Storybook story exercising `pyre-theme` class.
- [ ] Generate `apps/wyrdfold/` Nx app (Next.js, App Router,
      Tailwind, Vitest, Playwright e2e).
- [ ] Port `next.config.mjs` (security headers, caching, image
      formats, `optimizePackageImports`, `outputFileTracingIncludes`
      pruned to WyrdFold's actual OG routes).
- [ ] Port `proxy.ts` middleware rooted at `/` (no `/fitted` prefix).
- [ ] Stand up a separate Sentry project for WyrdFold; wire
      `next.config.mjs` `withSentryConfig` org/project; tunnelRoute
      `/monitoring`.
- [ ] Regenerate `.env.example` for the WyrdFold brand.
- [ ] Mount `ToastProvider` in WyrdFold's root layout.

**Done when:** `apps/wyrdfold/` boots a blank shell at `localhost`
with Pyre theme, Sentry instrumented, security headers verified.

## Phase 2 — Data foundation (Supabase)

Audit doc: `supabase-schema.md`.

- [ ] Decide rename mapping (supabase-schema.md §8) — sign-off
      required before mass code changes.
- [ ] Apply rename-pass migration to current Supabase; validate
      app still works under renames.
- [ ] Stand up `wyrdfold-prod` Supabase project.
- [ ] Schema-only dump from current Supabase → seed
      `00000000000001_init.sql` in `wyrdfold-prod`.
- [ ] Port functions, triggers, RPCs (supabase-schema.md §3).
- [ ] Port RLS policies (supabase-schema.md §4).
- [ ] Port storage buckets (supabase-schema.md §5).
- [ ] Regenerate types into `apps/wyrdfold/src/lib/supabase/types.ts`.

**Done when:** WyrdFold's Supabase project boots with the same
schema (renamed); types regenerate cleanly; a smoke query against
each table succeeds.

## Phase 3 — Backend port

Audit doc: `job-api.md`.

ADR choice: **fork now, library later** (job-api.md §10).

- [ ] Generate `apps/wyrdfold-api/` (FastAPI, mirror `apps/job-api`
      structure).
- [ ] Port routers, services, models with renamed identifiers.
- [ ] Wire to `wyrdfold-prod` Supabase + new env vars
      (`WYRDFOLD_API_URL`, `WYRDFOLD_API_KEY`, etc.).
- [ ] Wire Sentry to the new project (gap called out in
      job-api.md §7).
- [ ] Add per-user token-budget guards (defense-in-depth; tracked
      in `platform-readiness.md` §5 backstop).
- [ ] Port pytest suite (job-api.md §8).
- [ ] Deploy to staging; smoke-test endpoints.

**Done when:** `wyrdfold-api` answers a `/health` ping in staging,
routers/services tests pass, Sentry receives a test event.

## Phase 4 — Next.js BFF routes

Audit doc: `api-routes.md`.

- [ ] Port the 16+ BFF routes from `apps/root/src/app/api/` to
      `apps/wyrdfold/src/app/api/`.
- [ ] Rewire `proxyToFastAPI` helper to point at
      `WYRDFOLD_API_URL` / `WYRDFOLD_API_KEY`.
- [ ] Auth gating uses WyrdFold's Supabase session (no
      `adminSession` cookie path — that's audit-tool only).
- [ ] Sentry breadcrumbs preserved (`captureApiError`).
- [ ] Rate limits applied per Phase 0 plan.
- [ ] Audit/leads/contact/unsubscribe routes **stay on apps/root** —
      do not port (api-routes.md §8).

**Done when:** WyrdFold BFF routes proxy to `wyrdfold-api` and
return 200 for an authenticated session.

## Phase 5 — Surface ports (dependency order)

Audit docs (in order): `auth-onboarding.md`, `profile-settings.md`,
`targets.md`, `jobs.md`, `insights.md`.

Each surface is one PR (or sub-PR) merged into the migration umbrella.

### 5a. Auth + onboarding (auth-onboarding.md)

- [ ] Port `login/`, `onboarding/`, `(app)/layout.tsx`.
- [ ] Strip `/fitted/` prefixes from hardcoded paths
      (auth-onboarding.md §4) — root-relative URLs only.
- [ ] Update layout metadata to `WyrdFold` template + new
      description.
- [ ] Port `_components/ConversationChat*.tsx`.

### 5b. Profile + Settings (profile-settings.md)

- [ ] Port profile master-document editor.
- [ ] Port settings (identity + email notifications + threshold).
- [ ] PII masking already in place from Phase 0.

### 5c. Targets (targets.md)

- [ ] Port `targets/` route group (list + detail + ScoringProfile
      editor + reference JDs).
- [ ] Port pending-target flow.

### 5d. Jobs (jobs.md)

- [ ] Port `jobs/` list (table + mobile) + filters + tabs.
- [ ] Port `jobs/[id]/` detail (panel + score breakdown +
      lock/unlock + delete).
- [ ] Port `jobs/[id]/(resume|cover-letter)/` review pages.

### 5e. Insights (insights.md)

- [ ] Move `apps/root/src/hooks/useInsights.ts` into
      `apps/wyrdfold/src/app/(app)/insights/useInsights.ts`.
- [ ] Delete `useInsights` from `apps/root` (resolves the one
      reverse-coupling, dependency-coupling.md §2).
- [ ] Port chart components (Recharts lazy-loaded; preserve
      `dynamic({ssr: false})`).
- [ ] Pyre-tune Recharts palette (test-coverage.md a11y note).

**Done when:** WyrdFold serves all five surfaces from
`wyrdfold-api`, all data renders, screenshots match Fitted parity.

## Phase 6 — E2E + cutover

Audit doc: `test-coverage.md` §9 steps 4–5.

- [ ] Port + adapt the 6 fitted E2E specs (login, onboarding,
      profile, jobs, settings, insights) into
      `apps/wyrdfold-e2e/`.
- [ ] Run a baseline Lighthouse against staging WyrdFold.
- [ ] axe sweep on Pyre theme (contrast verification).
- [ ] Coordinate cutover plan — `/fitted/*` on `apps/root` either
      deletes, redirects to `wyrdfold.com`, or freezes (epic #564 §4).
- [ ] Strip `/fitted/*` from `apps/root/src/proxy.ts` after
      cutover.

**Done when:** WyrdFold passes all 6 E2E specs in CI, Lighthouse
≥ 90, axe clean; cutover plan signed off.

## Cross-cutting reference

`dependency-coupling.md` is the meta-inventory. Every phase touches
its tables — keep it open.

## Branching strategy

| Branch                                | Base             | Merges into      |
| ------------------------------------- | ---------------- | ---------------- |
| `feature/fitted`                      | `develop`        | `develop`        |
| `chore/wyrdfold-phase-0-hardening`    | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-1-foundation` | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-2-supabase`   | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-3-api`        | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-4-bff`        | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-5a-auth`      | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-5b-profile`   | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-5c-targets`   | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-5d-jobs`      | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-5e-insights`  | `feature/fitted` | `feature/fitted` |
| `feature/wyrdfold-phase-6-e2e`        | `feature/fitted` | `feature/fitted` |

Each phase's PR description should link the matching audit doc(s)
in this directory.
