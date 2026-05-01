# Test Coverage — Wyrdfold Migration Audit

Issue: #594 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

Two stories, sharply different:

- **Public site + audit tool + tools admin** — well-tested
  (~145 unit specs, 17 E2E specs, 65% coverage threshold
  enforced)
- **Fitted UI** — **effectively untested**: 70 source files,
  **1** unit spec (`exportCsv.spec.ts`), **0** E2E specs,
  **0** Storybook stories

The migration's principal test risk is concentrated on the
Fitted surface. **Job-api (Python) coverage is strong** (60
pytest files / 111 source = ~54%). **shared-ui is fully
covered** (47 specs + 47 stories — already migration-ready
per #593).

## 1. Coverage matrix (current)

| Surface                           | Source files | Specs | Stories | E2E    | Notes                                                               |
| --------------------------------- | ------------ | ----- | ------- | ------ | ------------------------------------------------------------------- |
| `apps/root/src/app/(public)/*`    | many         | ~50   | 1       | many   | covered via `audit-*`, `services`, etc.                             |
| `apps/root/src/app/tools/admin/*` | many         | ~17   | 0       | 1      | `tools-admin.spec.ts`                                               |
| `apps/root/src/app/fitted/*`      | **70**       | **1** | **0**   | **0**  | gap                                                                 |
| `apps/root/src/app/api/*`         | ~50          | ~33   | n/a     | api-\* | strong (audit fully, jobs partial)                                  |
| `apps/root/src/hooks/*`           | many         | 4     | n/a     | n/a    | useAdminTableFetch, useFocusTrap, useKeyboardShortcut, useTableSort |
| `apps/root/src/lib/*`             | many         | 17    | n/a     | n/a    | parsePartialJson, supabase, email/\* etc.                           |
| `libs/shared/ui/src/lib/*`        | ~50          | 47    | 47      | n/a    | full coverage (Vitest)                                              |
| `apps/job-api/app/*`              | 111          | 60    | n/a     | n/a    | pytest, ~54% file ratio                                             |

## 2. The fitted gap, broken down

```
apps/root/src/app/fitted/
├── (app)/insights/           — 16 src, 1 spec (exportCsv only)
├── (app)/jobs/               — 14 src, 0 specs
├── (app)/targets/            — 13 src, 0 specs
├── (app)/profile/            — 4 src,  0 specs
├── (app)/settings/           — 3 src,  0 specs
├── (app)/                    — DashboardPage etc., 0 specs
├── _components/              — 2 src (ConversationChat*), 0 specs
├── auth/callback/            — 1 src, 0 specs
├── login/                    — 1 src, 0 specs
└── onboarding/               — 1 src, 0 specs
```

The lone Fitted spec —
`apps/root/src/app/fitted/(app)/insights/__tests__/exportCsv.spec.ts`
— is the **gold-standard pattern** to mimic. It tests a pure
function with no React/DOM concerns. Easy to write, fast to
run.

Important nuance: many helpers used **by** Fitted are tested
in `apps/root/src/lib/__tests__/`:

- `parsePartialJson.spec.ts` — used by Profile re-derive +
  Jobs tailoring (audited in #585, #587)
- `email/tokens.test.ts` — unsubscribe HMAC (jobs alerts)

So the **logic** in `lib/` has coverage. What's untested is
the **wiring** in Fitted components.

## 3. Test infrastructure (already-paid cost)

The infra to test Fitted is **already in place**:

- **Jest config** (`apps/root/jest.config.ts`): Next-Jest
  preset, jsdom env, MDX transform, **65% coverage threshold
  enforced globally**
- **jest-axe** is wired (16 specs use it across the audit
  surface) — port the pattern to Fitted for a11y assertions
- **Playwright config** (`apps/root-e2e/playwright.config.ts`):
  webServer launches the built app, fixtures dir
  (`audit-mock-data.ts`, `base.fixture.ts`, `test-data.ts`),
  visual-regression snapshots, `serviceWorkers: 'block'` for
  WebKit-friendly route mocks. CI runs with retries=2,
  maxFailures=1
- **API route test pattern** (Node env): see
  `apps/root/src/app/api/jobs/proxy.test.ts` — uses
  `jest.mock('@/lib/adminSession')` +
  `jest.mock('@/lib/supabase/auth-server')` + module-scoped
  `mockGetUser`. Reuse this verbatim for any new BFF tests.

No new tooling needed — write tests, ship them.

## 4. The 65% coverage threshold

Set in `jest.config.ts`:

```ts
coverageThreshold: {
  global: { branches: 65, functions: 65, lines: 65, statements: 65 },
}
```

If we keep the threshold and don't add Fitted tests **before
porting**, two things happen:

1. Fitted source flips into `collectCoverageFrom`'s denominator
   without contributing to the numerator → coverage drops
2. CI starts failing the threshold post-merge

**Two valid responses:**

- **A. Lift the threshold per-directory** while Fitted is
  in flight (e.g. `coveragePathIgnorePatterns: ['/fitted/']`)
- **B. Keep the threshold and write tests as we port**

Recommended: **B for net-new ports** (Wyrdfold copies),
**A as a temporary safety net** during the transition. Don't
let coverage rot become a precedent.

## 5. What to test on Fitted (priority order)

### Tier 1 — load-bearing pure functions (cheap, high-value)

These are pure TS/JS modules where a test catches real bugs:

- [ ] **Insights `exportCsv.ts`** — already tested ✓
- [ ] **Jobs `lintViolations.ts`** — markdown lint for resume
      (referenced from ResumeReviewPage)
- [ ] **Targets `emptyScoringProfile()`** + scoring profile
      shape validation (`types.ts`)
- [ ] **Profile `consumeSse` / `parsePartialJson`** —
      already tested in `lib/__tests__/` ✓
- [ ] **Profile `hasOptimized` / `hasProse`** type guards
- [ ] **Insights `useInsights` hook** — abort signal
      handling + `'network' | 'http'` discrimination
- [ ] **Targets **`emptyScoringProfile()`\*\* default weights
      (negative.weight = -10)

### Tier 2 — component state machines (medium cost)

- [ ] **Settings per-section save** — `savingSection: 'profile'
    | 'email' | 'sms' | null` should never have two sections
      "saving" at once
- [ ] **Profile re-derive streaming** — buffered `delta` →
      partial JSON → `done` swap; test with mocked `consumeSse`
- [ ] **Profile gap-health → re-derive cache hit toast**
      (`cached: true` ⇒ info, `cached: false` ⇒ success)
- [ ] **InsightsDashboard period filter** — ARIA `aria-pressed` + URL/state preservation (or lack thereof)
- [ ] **JobsList batch action bar** — selection state +
      bulk-action enablement
- [ ] **ResumeReviewPage version dropdown** — switching
      versions discards/preserves draft

### Tier 3 — a11y (zero-effort with jest-axe)

For each major fitted page component, add an `axe-no-violations`
smoke test. Pattern already established in 16 audit specs.
~15 minutes per page.

### Tier 4 — E2E happy paths (highest cost, highest signal)

`apps/root-e2e/src/` has zero Fitted specs. Recommended new
specs:

- [ ] `fitted-login.spec.ts` — magic-link form, OTP stub,
      callback redirect, return-path preservation
- [ ] `fitted-onboarding.spec.ts` — conversation chat happy
      path
- [ ] `fitted-profile.spec.ts` — upload PDF, see derived
      payload, edit master doc, save
- [ ] `fitted-jobs-flow.spec.ts` — paste JD → score → tailor
      resume → approve → download
- [ ] `fitted-settings.spec.ts` — three per-section saves
      independently, provider gating disables sections
- [ ] `fitted-insights.spec.ts` — period filter, drill-through
      to jobs list, CSV export

Each adds ~30-90s to CI. Stage as separate file so failure
isolates the failing flow.

## 6. Storybook gaps

10 stories total on root, **0 on fitted**. shared-ui is fully
covered (47 stories).

Adding stories for fitted page components is **not required**
for migration. Defer until post-migration unless a chart
palette tuning loop wants them (audited in #586 — Recharts
palette retune for Pyre theme). At that point, story-driven
tuning of `charts/colors.ts` would be useful.

## 7. job-api test depth

60 pytest files cover 111 source files. Key wins:

- All ATS sources (Ashby, Greenhouse, Lever, SmartRecruiters,
  Workday) have dedicated tests
- LLM clients tested with both real-API patterns and mocks
- Tailor pipeline split into `test_tailor.py` +
  `test_tailor_pipeline.py` + `test_tailor_versions.py` +
  `test_tailor_contact.py` + `test_tailor_gap_gate.py`
- Targets fully covered: `test_target_scoring`,
  `test_targets_derive`, `test_targets_fit_score`,
  `test_targets_from_input`, `test_targets_match`,
  `test_targets_merge`, `test_targets_models`,
  `test_targets_suggest`, `test_targets_user_links`

For migration: **pytest suite ports as-is**. The other
session is currently editing 5 of these test files
(`test_analysis`, `test_batch`, `test_llm_anthropic`,
`test_llm_mock`, `test_resume_lifecycle`) per the dirty
status — coordinate to land their refinements before
forking.

## 8. Coverage gaps in API routes (root)

Tested:

- All `/api/audit/*` routes ✓
- All `/api/email/*` routes ✓
- All `/api/tools/*` (admin auth) ✓
- `/api/jobs/route.ts`, `/api/jobs/proxy.ts`, sources, poll,
  status ✓
- `/api/career/experience/optimized`,
  `/api/career/experience/prose` ✓

**Untested** (needed for Wyrdfold migration confidence):

- `/api/jobs/[id]/route.ts` (job detail)
- `/api/jobs/insights/{pipeline,targets,skills-cost}` (3 routes)
- `/api/jobs/targets/*` (target CRUD via BFF)
- `/api/career/experience/{gap-health,upload-resume,derive,prose/consolidate}`
- `/api/profile/{notifications,identity}` (settings backing)
- `/api/conversation/*`

These all follow the **same proxy pattern** — copy
`proxy.test.ts` as a template, swap the URL, mock the auth
return.

## 9. Pre-migration test plan (concrete, ordered)

The cheapest thing that materially de-risks the port:

| Step | Effort | Files to add                                                              | Catches                                     |
| ---- | ------ | ------------------------------------------------------------------------- | ------------------------------------------- |
| 1    | S      | Tier-1 pure functions (Targets/Jobs/Profile)                              | type-guard regressions, lint logic          |
| 2    | M      | API route tests for the 9 untested BFF endpoints                          | proxy auth, request shape drift             |
| 3    | M      | `useInsights` + `useAdminTableFetch`-style hooks tests                    | abort signal handling, error discrimination |
| 4    | L      | jest-axe smoke for each fitted page component                             | a11y regressions during port                |
| 5    | L      | 6 fitted E2E specs (login, onboarding, profile, jobs, settings, insights) | end-to-end wiring after the port lands      |

Steps 1-3 are pre-port (catch issues before forking). Steps
4-5 can run in parallel with the port itself (catch issues as
you wire each surface).

## 10. Wyrdfold-side test inheritance

When forking Fitted into Wyrdfold:

- **Copy:** `lib/__tests__/parsePartialJson.spec.ts`,
  `email/tokens.test.ts`, all 4 `hooks/__tests__/*`,
  `insights/__tests__/exportCsv.spec.ts`
- **Adapt:** API route tests (URLs change but pattern is
  identical)
- **Re-write from scratch:** anything new (Pyre theme tests,
  brand-specific E2E flows)
- **Skip:** public-site, audit-tool, tools-admin tests
  (those stay on the root app)

## 11. CI cost projection

Current CI runtime (rough): ~3-5 min unit, ~8-12 min E2E.
Adding 6 Fitted E2E specs at ~60s avg ≈ **+6 min E2E**.
Adding ~30 Fitted unit specs ≈ **+30s unit** (jsdom is fast).

If the budget tightens, parallelize E2E by sharding (Playwright
already supports `--shard`). The Nx runner doesn't currently
shard — flag for #595.

## 12. Open questions

1. **Coverage threshold strategy.** Keep 65% global and skip
   `/fitted/` while porting, or lower temporarily to 50%? The
   former is preferable — it preserves the signal everywhere
   else.
2. **MSW vs jest.mock for API routes in component tests.**
   Currently component specs use `jest.mock('global.fetch')`
   ad-hoc. MSW would be cleaner but adds a dep. Defer the
   choice; file an ADR if the team picks it up.
3. **Visual regression scope.** `visual-regression.spec.ts`
   exists but doesn't cover Fitted. Adding snapshots for the
   Pyre theme port is high-signal, but snapshots are
   maintenance-heavy. Recommend deferring until post-port,
   then snapshot the steady-state.
4. **a11y as gate vs report.** jest-axe currently runs
   inline; CI doesn't fail on a11y regressions in a separate
   tier. Consider a `pnpm nx test root --testPathPattern=axe`
   gate as part of `pom`.

## 13. Decision summary

| Question                  | Answer                                                     |
| ------------------------- | ---------------------------------------------------------- |
| Fitted unit-test coverage | **1 spec / 70 sources** — gap                              |
| Fitted E2E coverage       | **0 specs**                                                |
| Fitted Storybook coverage | **0 stories**                                              |
| shared-ui coverage        | 47 specs + 47 stories — full ✓                             |
| job-api coverage          | 60 tests / 111 source ≈ 54% — strong                       |
| API route (BFF) coverage  | ~33 of ~50 routes — strong                                 |
| Test infra readiness      | jest-axe, Playwright, fixtures all in place — no new infra |
| Coverage threshold        | 65% global; consider per-dir override during fitted port   |

## 14. Collisions

Other session is editing 5 job-api test files
(`test_analysis`, `test_batch`, `test_llm_anthropic`,
`test_llm_mock`, `test_resume_lifecycle`). **Land theirs
first** before any pytest changes ride alongside this audit.
This audit modifies docs only — no overlap.
