# Phase 3 Findings — Test posture (coverage gaps)

**Run date:** 2026-05-04
**Branch:** audit/wyrdfold-pre-deploy
**Skill mirrored:** /coverage-gaps
**Scope:** libs/shared/ui, apps/wyrdfold (components, hooks, lib, app/)

## Summary

Scanned 45 shared-ui components, 3 wyrdfold kit components, 5 hooks, 10 lib modules, and 72 app/ files (19 high-priority + 27 route + 26 presentational). Shared-ui is fully covered (0 spec gaps, 0 story gaps) — the design system is healthy. The wyrdfold app, however, has near-zero unit coverage: every kit component, every hook, 9/10 lib modules, and every high-priority `*Page/*Form/*Wizard/*Card/*List/*Editor/*Dashboard` component is untested. The fitted→wyrdfold port appears to have left specs behind: `apps/root` has direct counterparts (e.g. `Button.spec.tsx`, `useAdminTableFetch.spec.ts`, `parsePartialJson.spec.ts`, `Nav/__tests__/DarkModeToggle.spec.tsx`) that were not carried over. Concentration is heaviest under `apps/wyrdfold/src/app/(app)/jobs/` and `apps/wyrdfold/src/app/(app)/targets/`. Severity counts: P0 0, P1 5, P2 27, P3 ~50+.

## Resolution status

All P1 and P2 gaps closed on this branch. Two parallel agents authored 31 new specs (5 P1 from scratch + 26 P2 mix of port + author). Final wyrdfold test posture: **35 spec suites, 237 passing tests** (up from 4 / 35). P3 batch (route boundaries + presentational subcomponents) deferred to next phase per the audit plan; some of P3 will be better served by Playwright e2e (currently empty for wyrdfold) than unit specs.

| Group                                            | Status       | Count | Notes                                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------------ | ------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** (auth + onboarding + jobs critical paths) | ✅ All fixed | 5     | 48 new tests authored. Sentry-mask asserted on `MagicLinkForm` email input.                                                                                                                                                                                                                                                                   |
| **P2 — mechanical ports** (apps/root twins)      | ✅ All fixed | 8     | Class 1: Button, DarkModeToggle, useAdminTableFetch, useFocusTrap, useKeyboardShortcut, useTableSort, parsePartialJson, analytics. Mostly clean copies; `analytics.spec` trimmed to wyrdfold's smaller surface.                                                                                                                               |
| **P2 — authored lib + hook**                     | ✅ All fixed | 5     | Class 2: useInsights, consumeSse, supabase/auth-client, supabase/auth-server, plus WyrdfoldLogo as a freebie (P3 in original audit).                                                                                                                                                                                                          |
| **P2 — app components**                          | ✅ All fixed | 13    | Class 3: DashboardPage, InsightsDashboard, JobCard, JobsListView, CoverLetter/ResumeReviewPage, ProfilePage, SettingsPage, PendingTargetCard, TargetCard, TargetsList, ReferenceJDList, ScoringProfileEditor. Smoke + key-behavior coverage; full SSE/approve/save flows on the review pages deferred (need larger fetch + SSE harness).      |
| **P3 — route boundaries**                        | ⏭ Phase 5+  | 27    | Better served by Playwright e2e — wyrdfold-e2e project is currently empty; scoped for Phase 5.                                                                                                                                                                                                                                                |
| **P3 — presentational subcomponents**            | ✅ All fixed | 24    | Two parallel agents authored 24 specs (10 charts + onboarding subcomponents from Group A; 14 jobs subcomponents + sidebar + modals + conversation + targets detail from Group B). 4 audit-listed sources didn't exist (chart list was stale; one Skeleton excluded as low-ROI). Final wyrdfold posture: **59 suites / 376 tests, all green**. |

## libs/shared/ui (spec + story)

All 45 shared-ui components have both a `.spec.tsx` and `.stories.tsx`. No gaps.

| Component | Spec | Story | Severity | Notes                     |
| --------- | ---- | ----- | -------- | ------------------------- |
| _(none)_  | —    | —     | —        | All 45 components covered |

## apps/wyrdfold/src/components

All 3 are kit-style components ported from `apps/root` where specs exist — copy them.

| Component              | Spec | Severity | Notes                                                                                                                  |
| ---------------------- | ---- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| Button.tsx             | ✗    | P2       | Wraps shared-ui Button; lint requires `name` prop. Follow `apps/root/src/components/Button.spec.tsx` exactly.          |
| Nav/DarkModeToggle.tsx | ✗    | P2       | Theme toggle; client component. Follow `apps/root/src/components/Nav/__tests__/DarkModeToggle.spec.tsx`.               |
| WyrdfoldLogo.tsx       | ✗    | P3       | Pure SVG presentational; smoke + a11y is enough. Follow shared-ui icon-component spec shape (e.g. `Spinner.spec.tsx`). |

## apps/wyrdfold/src/hooks

All five hooks have direct twins under `apps/root/src/hooks/__tests__/` with passing specs — port them.

| Hook                   | Spec | Severity | Notes                                                                                                         |
| ---------------------- | ---- | -------- | ------------------------------------------------------------------------------------------------------------- |
| useAdminTableFetch.ts  | ✗    | P2       | Stateful fetch hook; high logic surface. Follow `apps/root/src/hooks/__tests__/useAdminTableFetch.spec.ts`.   |
| useFocusTrap.ts        | ✗    | P2       | A11y-critical (modal/dialog focus). Follow `apps/root/src/hooks/__tests__/useFocusTrap.spec.ts`.              |
| useInsights.ts         | ✗    | P2       | New (no apps/root twin); SWR-style data hook. Follow `useAdminTableFetch.spec.ts` shape, mock fetch boundary. |
| useKeyboardShortcut.ts | ✗    | P2       | Global key handler; a11y-adjacent. Follow `apps/root/src/hooks/__tests__/useKeyboardShortcut.spec.ts`.        |
| useTableSort.ts        | ✗    | P2       | Pure logic hook. Follow `apps/root/src/hooks/__tests__/useTableSort.spec.ts`.                                 |

## apps/wyrdfold/src/lib

Established pattern: `*.ts` paired with `*.test.ts` (see `lib/api/proxy.test.ts`).

| Module                  | Spec | Severity | Notes                                                                                                                               |
| ----------------------- | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| analytics.ts            | ✗    | P2       | Telemetry wrapper. Follow `apps/root/src/lib/analytics.spec.ts`.                                                                    |
| cn.ts                   | ✗    | P3       | Pure tailwind-merge wrapper; trivial. Follow shared-ui pattern (it's a re-export — could even be a 3-line smoke test).              |
| consumeSse.ts           | ✗    | P2       | SSE stream parser used by AI flows; high bug-surface. Mock a `ReadableStream`; follow `lib/api/proxy.test.ts` for fetch-mock shape. |
| parsePartialJson.ts     | ✗    | P2       | Streaming JSON parser. Follow `apps/root/src/lib/__tests__/parsePartialJson.spec.ts` exactly.                                       |
| public.env.ts           | ✗    | P3       | Env validation; consider testing the throw paths.                                                                                   |
| sentry.config.ts        | ✗    | P3       | Mostly declarative; low ROI.                                                                                                        |
| supabase/auth-client.ts | ✗    | P2       | Browser auth client factory; mock `@supabase/ssr`. Smoke + env-coupling.                                                            |
| supabase/auth-server.ts | ✗    | P2       | Server auth client; cookie reading. Mock `next/headers` + `@supabase/ssr`.                                                          |
| supabase/types.ts       | ✗    | —        | Type-only — exclude from gap list.                                                                                                  |

## apps/wyrdfold/src/app (high-priority components)

Every `*Page/*Form/*Wizard/*Card/*List/*Editor/*Dashboard/*Chooser/*Skeleton` component lacks a spec. The five marked **P1** sit on critical pre-deploy user flows (auth, onboarding, jobs).

| Component                                              | Spec | Severity | Notes                                                                                                                                           |
| ------------------------------------------------------ | ---- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| login/MagicLinkForm.tsx                                | ✗    | **P1**   | Auth entry point; form validation + Sentry-masked email. Follow `apps/root/src/components/contact/ContactForm.spec.tsx`.                        |
| onboarding/OnboardingWizard.tsx                        | ✗    | **P1**   | Multi-step wizard, gates first-time users. Follow wizard-shape spec in shared-ui (Stepper.spec.tsx).                                            |
| onboarding/PathChooser.tsx                             | ✗    | **P1**   | Branch selection inside wizard; behavioral. Follow `apps/root/src/components/Nav/__tests__/DarkModeToggle.spec.tsx` shape (radio-group toggle). |
| (app)/jobs/JobsList.tsx                                | ✗    | **P1**   | Primary jobs surface; pagination + filter + batch actions. Follow shared-ui list patterns; mock API at boundary.                                |
| (app)/jobs/[id]/JobDetailPage.tsx                      | ✗    | **P1**   | Per-job detail; entry to resume/cover-letter flows. Smoke + axe + key CTA assertions.                                                           |
| (app)/DashboardPage.tsx                                | ✗    | P2       | Authenticated landing; mostly composition.                                                                                                      |
| (app)/insights/InsightsDashboard.tsx                   | ✗    | P2       | Orchestrates 8 chart components; mock useInsights.                                                                                              |
| (app)/jobs/JobCard.tsx                                 | ✗    | P2       | Repeated row component; light logic.                                                                                                            |
| (app)/jobs/JobsListView.tsx                            | ✗    | P2       | View-mode container; toggle logic.                                                                                                              |
| (app)/jobs/[id]/cover-letter/CoverLetterReviewPage.tsx | ✗    | P2       | AI review surface; SSE-driven.                                                                                                                  |
| (app)/jobs/[id]/resume/ResumeReviewPage.tsx            | ✗    | P2       | AI review surface; SSE-driven.                                                                                                                  |
| (app)/profile/ProfilePage.tsx                          | ✗    | P2       | PII-bearing form; needs `aria-describedby` + `data-sentry-mask` assertions.                                                                     |
| (app)/settings/SettingsPage.tsx                        | ✗    | P2       | Notifications toggles; preferences.                                                                                                             |
| (app)/targets/PendingTargetCard.tsx                    | ✗    | P2       | Repeated row; status-driven.                                                                                                                    |
| (app)/targets/TargetCard.tsx                           | ✗    | P2       | Repeated row; behavioral.                                                                                                                       |
| (app)/targets/TargetsList.tsx                          | ✗    | P2       | List container.                                                                                                                                 |
| (app)/targets/[id]/ReferenceJDList.tsx                 | ✗    | P2       | List w/ delete actions.                                                                                                                         |
| (app)/targets/[id]/ScoringProfileEditor.tsx            | ✗    | P2       | Form/editor for scoring weights; logic-heavy.                                                                                                   |
| (app)/targets/[id]/TargetDetailSkeleton.tsx            | ✗    | P3       | Pure skeleton; smoke only.                                                                                                                      |

## Out-of-scope notes for Phase 4+

- **Route boundary files (P3, e2e is the right gate):** 27 `page.tsx`/`layout.tsx`/`loading.tsx`/`error.tsx`/`not-found.tsx`/`route.ts` files under `apps/wyrdfold/src/app/` and `apps/wyrdfold/src/app/api/` have no specs. Expected — these are server boundaries; cover via Playwright in Phase 5+.
- **Presentational subcomponents (P3):** 26 non-spec'd `.tsx` files outside the high-priority pattern (8 chart components under `(app)/insights/charts/`, 7 jobs subcomponents under `(app)/jobs/` like `BatchActionBar`, `JobsFilter`, `JobsListMobile`, `JobsListTable`, `StatusIndicator`, `JobDetailPanel`, `CoverLetterSection`; 4 onboarding subcomponents `CompletionScreen/JobUrlInput/ResumeUploader/TargetSuggestions`; `WyrdfoldSidebar`, `CreateTargetModal`, `AddReferenceJDModal`, `TargetDetail`, `_components/ConversationChat[Modal]`, `global-error.tsx`). Treat as a follow-up sweep — pick up the highest-traffic ones (JobsListTable, ConversationChat, charts) first.
- **`global-error.tsx`** is intentionally inline-styled (per coding-conventions); spec-able but very low ROI.
- **Existing test fixtures:** `apps/wyrdfold/src/lib/api/proxy.test.ts`, `app/(app)/insights/__tests__/exportCsv.spec.ts`, `app/(app)/profile/__tests__/types.spec.ts`, `app/(app)/targets/__tests__/types.spec.ts` are the only four pre-existing test files in the wyrdfold app — confirms scope of the gap.
- **Storybook for wyrdfold-only kit components** is not required by skill rules but `WyrdfoldLogo` could earn a story if promoted to shared-ui (Rule of Three: only 1 usage today).
- **No e2e exists for wyrdfold** under `apps/root-e2e/` — Phase 5 should scope a wyrdfold-e2e project covering: magic-link login, onboarding wizard, jobs list filter/sort, target creation, AI review SSE happy-path.
