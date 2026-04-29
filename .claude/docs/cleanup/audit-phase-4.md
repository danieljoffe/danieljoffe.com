# Audit Phase 4 — Fitted UI

Covers Phase 4 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): UI shell, onboarding flow, jobs list + detail, target management.

**Sub-issues:** [#506](https://github.com/danieljoffe/danieljoffe.com/issues/506) · [#507](https://github.com/danieljoffe/danieljoffe.com/issues/507) · [#508](https://github.com/danieljoffe/danieljoffe.com/issues/508) · [#509](https://github.com/danieljoffe/danieljoffe.com/issues/509)

## Phase summary

| Sub-issue               | Status | Headline finding                                                                                                                                                                                                                                                                                                             |
| ----------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #506 UI shell           | 🟡     | Layout, dark mode, mobile, route protection all in place. Two real gaps: zero error/not-found boundaries in the entire fitted tree (F4-B); `/fitted` lands on a separate Dashboard page rather than the jobs list the spec called for (F4-E). DarkModeToggle renders twice on mobile when the slide-in panel is open (F4-C). |
| #507 Onboarding         | ❌     | Path A (auto-create from posting) works. Paths B/C are silently broken: `TargetSuggestions.tsx:89-92` reads `data.suggestions` from `/api/targets/suggest`, but Phase 3 changed the response shape to `{matches: MatchedSuggestion[]}`. Suggestions never render — users always fall through to the manual fallback (F4-D).  |
| #508 Jobs list + detail | 🟡     | List, batch select, click-in panel, status management, manual badge, pagination, score visualization all present. The `/fitted/jobs/[id]` route is a 4-Skeleton placeholder with no data fetching (F4-A) — the real detail experience is the inline-expanded `JobDetailPanel`. Either delete the route or wire it up.        |
| #509 Target management  | ✅     | Create (label + JD text + URL + from-posting), edit scoring profile (TagList editor with categories/seniority/domain/negative), reference JD list + add modal, suggested-target cloud, fit-score badges, activate/deactivate, delete with confirm. No findings.                                                              |

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #506 — UI shell, navigation, dark mode, mobile, route protection

### Status: 🟡 partial — shell works; error boundaries and root-route default need attention

### Code map

**Layout / shell**

- `apps/root/src/app/fitted/layout.tsx` — outer layout (loads ThemeProvider, ToastProvider).
- `apps/root/src/app/fitted/(app)/layout.tsx` — inner authenticated layout, wraps children with `<FittedSidebar>`.
- `apps/root/src/app/fitted/(app)/FittedSidebar.tsx` (218 lines) — sidebar component with desktop fixed + mobile slide-in panel, focus trap, body scroll lock, escape handler, hamburger button.
- `apps/root/src/app/fitted/(app)/page.tsx` — root `/fitted` route renders `<DashboardPage />`.
- `apps/root/src/app/fitted/(app)/DashboardPage.tsx` — Document Health, Master Document, Derived Document cards + onboarding link.

**Auth / route protection**

- `apps/root/src/proxy.ts:handleFittedAuth()` (188 lines total file) — Supabase Auth SSR check. Redirects unauthenticated requests for `/fitted/*` to `/fitted/login`. Exempts `/fitted/login` and `/fitted/auth`.
- `apps/root/src/app/fitted/login/page.tsx` + `MagicLinkForm.tsx` — magic link auth.

**Dark mode**

- `@/components/Nav/DarkModeToggle` — shared kit toggle.
- Used in `FittedSidebar.tsx:131` (sidebar footer) and `FittedSidebar.tsx:159` (mobile top bar).

**Loading skeletons** (8 files, all spec-compliant)

- `(app)/loading.tsx`, `jobs/loading.tsx`, `jobs/[id]/loading.tsx`, `targets/loading.tsx`, `targets/[id]/loading.tsx`, `profile/loading.tsx`, `insights/loading.tsx`, `settings/loading.tsx`.

### Acceptance criteria

| AC                                             | Status | Evidence                                                                                                        |
| ---------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------- |
| `/fitted` layout with navigation               | ✅     | `(app)/layout.tsx` + `FittedSidebar.tsx`                                                                        |
| Dark mode toggle works                         | ✅     | `DarkModeToggle` in sidebar footer + mobile top bar                                                             |
| Mobile-responsive                              | ✅     | `md:hidden` top bar + slide-in panel with focus trap and backdrop (`FittedSidebar.tsx:147-204`)                 |
| Loading skeletons on data-fetching pages       | ✅     | 8 `loading.tsx` files across the fitted tree                                                                    |
| Route protection (redirect to login if unauth) | ✅     | `proxy.ts::handleFittedAuth()` — Supabase SSR check, redirect to `/fitted/login`, exempts login + auth callback |
| Admin dashboard unchanged at `/tools/admin/`   | ✅     | Untouched — separate route tree                                                                                 |
| Error boundaries on data-fetching pages        | ❌     | **No `error.tsx` or `not-found.tsx` anywhere in `/fitted/*`** — see F4-B                                        |

### Findings

**F4-A: `/fitted/jobs/[id]/page.tsx` is a dead route — Skeleton placeholder with no data fetching (also affects #508)**
The file renders 4 `<Card>` blocks ("Company Info", "Job Description", "LLM Analysis", "Notes") each with `<Skeleton variant='text' lines={N} />` and a back-arrow link to `/fitted` — but no `fetch`, no params resolution beyond `id`, no `JobDetailPanel` usage. The actual detail experience lives in `apps/root/src/app/fitted/(app)/jobs/JobDetailPanel.tsx` (373 lines) and is rendered inline-expanded inside `JobsListTable.tsx` via `expandedId`. Nothing in the app routes the user to `/fitted/jobs/[id]` — the table click expands inline.

Two design directions in tension:

- **#506 spec**: "`/fitted/jobs/[id]` — job detail with LLM analysis"
- **#508 spec**: "Click-in detail panel — Expandable panel (not full page navigation)"

The implementation chose the inline panel (which matches #508). The leftover route file is dead code that misleads anyone reading the route tree. Either:

- **Delete** `[id]/page.tsx` and `[id]/loading.tsx` (and update the back-arrow target if anyone added a link).
- **Wire it up** as a deep-link landing target — useful for sharing / bookmarking a specific job — that fetches `posting + analysis` server-side and renders the same `<JobDetailPanel>` (no longer modal-style).

Recommendation: **wire it up**. Deep-links matter for a multi-user app: emails ("you got a great match"), Slack, browser history. The inline panel stays as the default UX; the route becomes a fallback that reuses the same component.

**F4-B: zero error / not-found boundaries in the fitted tree**
`Glob: apps/root/src/app/fitted/**/{error,not-found,global-error}.tsx` → no matches. The fitted shell has 8 `loading.tsx` files but no error boundaries. If any server component throws (e.g., Supabase RPC failure on `DashboardPage.tsx`'s document health fetch), the user sees Next.js's default error UI rendered outside the sidebar shell — jarring and uninformative.

Minimum viable: add `apps/root/src/app/fitted/(app)/error.tsx` (catches inside the authenticated shell) with a Card-styled retry button + sign-out link, and `apps/root/src/app/fitted/(app)/not-found.tsx` for typo'd URLs. The kit already has `<Card>`, `<Alert>`, `<Heading>`, `<Button>` — these compose into a 30-line file.

**F4-C: DarkModeToggle visible twice on mobile when sidebar is open**
`FittedSidebar.tsx:131` is in `sidebarFooter`, which is passed as `footer` to **both** the desktop sidebar (line 213) and the mobile slide-in panel (line 202). `FittedSidebar.tsx:159` is in the mobile-only top bar (`md:hidden` header). On mobile, when the user taps the hamburger to open the slide-in panel, both DarkModeToggles are visible at the same time — top bar one (always visible on mobile) plus the footer one (visible while panel open). Minor visual noise, no functional bug.

Fix options:

- Drop the top-bar toggle and rely on the sidebar footer (one extra tap on mobile).
- Or: hide the footer toggle when on mobile (conditional `hidden md:block` wrapper around the toggle inside `sidebarFooter`).

**F4-E: `/fitted` defaults to DashboardPage, not jobs list (spec divergence)**
`#506` ACs and route structure say: "`/fitted` — main dashboard (jobs list, default view)" — i.e., the root path IS the jobs list. The implementation has `(app)/page.tsx` render `<DashboardPage />` (Document Health + Master Document + Derived Document cards), and the jobs list lives at `/fitted/jobs`. Two interpretations:

- **Spec evolved**: a dedicated dashboard makes sense once Profile + Insights + Targets are real surfaces; "main dashboard" in the spec was loose language. The actual spec text is "main dashboard (jobs list, default view)" — parenthetical suggests the original intent was a single page.
- **Implementation drifted**: the user lands somewhere that isn't the primary work surface; one extra click to get to jobs.

Either is defensible. Worth a confirming decision so the spec and the code agree. If we keep DashboardPage as the root, update `#506` spec to reflect ("/fitted — overview dashboard"). If we revert to jobs-as-root, move DashboardPage to `/fitted/dashboard` (or fold it into `/fitted/profile` — much of its content is master-doc related).

### Fixes applied

- **F4-B**: added `apps/root/src/app/fitted/(app)/error.tsx` (client; reports to Sentry with `route` tag + digest) and `apps/root/src/app/fitted/(app)/not-found.tsx` (server; static Card). Both use kit `Card`/`Heading`/`Text`/`Button`.
- **F4-C**: removed the second `<DarkModeToggle />` from the mobile top bar in `FittedSidebar.tsx`. The one in the sidebar footer is the single source of truth on every viewport.
- **F4-E**: rebuilt `apps/root/src/app/fitted/(app)/DashboardPage.tsx` as a job-focused command center:
  - Header: title + small "Profile X% →" link badge to `/fitted/profile` (only if profile exists).
  - Pipeline strip: 4 clickable stat tiles for `new` / `saved` / `resume_draft` / `applied`, each linking to the filtered jobs list.
  - Top matches card: 5 highest-scoring `status='new'` jobs sorted by score, each row links to `/fitted/jobs/{id}`. Empty state when nothing new is in the queue.
  - Zero state: prompts to set up profile or start onboarding (no profile yet).
  - Migrated Document Health / Master Document machinery (upload, derive, edit, save, ConversationChat) into `apps/root/src/app/fitted/(app)/profile/ProfilePage.tsx` so the existing "Improve with AI" → chat → re-derive loop is preserved without polluting the homepage.

---

## #507 — Onboarding flow (three paths)

### Status: ❌ broken — Paths B/C suggestions step does not render

### Code map

- `apps/root/src/app/fitted/onboarding/page.tsx` — entry, renders `<OnboardingWizard>`.
- `apps/root/src/app/fitted/onboarding/OnboardingWizard.tsx` — step orchestrator with `STEPS_BY_PATH` map (paths A/B/C) and progress indication.
- `apps/root/src/app/fitted/onboarding/PathChooser.tsx` — three-option selection screen.
- `apps/root/src/app/fitted/onboarding/JobUrlInput.tsx` — Path A: paste job URL → `POST /api/jobs/manual-entry` → `JobData{postingId, label}`.
- `apps/root/src/app/fitted/onboarding/ResumeUploader.tsx` — Paths A/B: upload .pdf/.docx → master doc creation.
- `apps/root/src/app/fitted/onboarding/TargetSuggestions.tsx` (397 lines) — Path A: auto-create from posting via `/api/targets/from-posting/{id}`. Paths B/C: fetch `/api/targets/suggest`, render selectable cards, batch-create on confirm.
- `apps/root/src/app/fitted/onboarding/CompletionScreen.tsx` — final step (no skip — intentional).

**API contract (Phase 3)**

- `apps/job-api/app/routers/targets.py:154-179` — `POST /targets/suggest` → `MatchedSuggestions{matches: MatchedSuggestion[]}` (changed in Phase 3 from `{suggestions: ...}`).
- `apps/job-api/app/models/targets.py:182` — `MatchedSuggestions` schema.

### Acceptance criteria

| AC                                              | Status | Evidence                                                                                                         |
| ----------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| Three-option selection screen after first login | ✅     | `PathChooser.tsx`                                                                                                |
| Skip button on every step                       | 🟡     | All steps have skip except `CompletionScreen` (intentional — final step)                                         |
| Option A: full flow resume → first application  | ✅     | `OnboardingWizard.tsx` Path A: ResumeUploader → JobUrlInput → TargetSuggestions (auto-create) → CompletionScreen |
| Option B: resume → suggested target browsing    | ❌     | TargetSuggestions step is broken (F4-D) — the suggestion cards never render, falls through to manual prompt      |
| Option C: conversational master doc → targets   | 🟡     | Conversation step exists in `_components/ConversationChat.tsx`; TargetSuggestions step is broken (F4-D)          |
| Each path converges to the main dashboard       | ✅     | `CompletionScreen` redirects to `/fitted` on continue                                                            |
| Progress indication                             | ✅     | `OnboardingWizard.tsx` STEPS_BY_PATH + step counter UI                                                           |

### Findings

**F4-D: `TargetSuggestions.tsx` reads `data.suggestions` but Phase 3 API returns `{matches: ...}` — Paths B/C silently broken (MAJOR)**
`apps/root/src/app/fitted/onboarding/TargetSuggestions.tsx:89-92`:

```ts
const data = (await res.json()) as {
  suggestions: Suggestion[];
};
if (!cancelled && data.suggestions?.length > 0) {
```

Phase 3 (commit `53f32e6d feat(targets): Phase 3 — target matching in suggestion flow`) changed `/api/targets/suggest` to return `MatchedSuggestions{matches: MatchedSuggestion[]}` (verified at `apps/job-api/app/routers/targets.py:154-179` and `app/models/targets.py:182`). Each match carries an `existing` flag and a fit score — richer info than the old shape. The frontend was never updated.

Effect: `data.suggestions?.length > 0` is always falsy → `setSuggestions(...)` never called → `suggestions.length > 0` branch in render is skipped → user falls into the "fallback to manual prompt" UI ("Set up your job targets / Create your first target / Skip for now"). This is the same UI shown when the LLM returns zero suggestions or errors — so the failure is **silent**: no error toast, no console warning, just a wrong-looking page.

Fix shape: read `data.matches`, map `MatchedSuggestion → Suggestion` (the local type only needs `label`, `description`, `core_skills` — Phase 3's `MatchedSuggestion` carries the same plus `existing: bool`, `target_id?: UUID`, `fit_score?: int`). Worth using the richer payload to:

- Show "✓ Already in your targets" badge on `existing: true` rows (and disable the checkbox).
- Display the `fit_score` next to each suggestion.
- POST to `/api/targets/{id}/link` for `existing` matches (instead of creating a duplicate via `POST /api/targets`).

Quick fix (minimum viable): just rename `suggestions → matches` and ignore the new fields. Right fix: surface them. Recommend the right fix — small extra work, much better UX.

**F4-D-bis: `TargetSuggestions.tsx:140` uses POST `/api/targets {label}` which won't link the user** _(corollary of F4-D)_
Even after F4-D's parsing fix, `handleCreateSelected` posts `{label}` to `/api/targets` — that creates the shared target but does **not** link the current user via `user_targets` (Phase 3's split). For new (non-existing) suggestions, the flow needs `POST /api/targets` then `POST /api/targets/{id}/link`. For existing matches, just `POST /api/targets/{id}/link`. Otherwise the user finishes onboarding with zero entries in `user_targets` and `/fitted/targets` shows them an empty state.

### Fixes applied

- **F4-D + F4-D-bis**: `apps/root/src/app/fitted/onboarding/TargetSuggestions.tsx` now reads `data.matches`, surfaces an "Existing" badge on already-linked targets, and routes `is_new=false` selections through `POST /api/targets/{id}/link` while `is_new=true` selections create the shared target then link the user. Replaced the local `Suggestion` interface with the typed `MatchedSuggestion` from `targets/types`.

---

## #508 — Jobs list + detail views

### Status: 🟡 partial — list / batch / panel / lifecycle all working; route gap from F4-A

### Code map

**List + filtering**

- `apps/root/src/app/fitted/(app)/jobs/page.tsx` — `/fitted/jobs` server component, reads `?target=` searchParam.
- `apps/root/src/app/fitted/(app)/jobs/JobsList.tsx` (455+ lines) — orchestrator: target tabs ("All Jobs" + per-target), filter bar, batch action bar, table, batch operations.
- `apps/root/src/app/fitted/(app)/jobs/JobsListTable.tsx` (380+ lines) — `useAdminTableFetch` hook, sortable columns (score / title / company / posted), `Pagination`, expandable inline panel via `expandedId`, `ScoreBadge`, `StatusBadge`, manual-source badge.
- `apps/root/src/app/fitted/(app)/jobs/JobsFilter.tsx` — min score / status / search inputs (no date filter).
- `apps/root/src/app/fitted/(app)/jobs/types.ts` — `JobPosting`, `JobsFilterState`, `JobsSortColumn`, `MANUAL_SOURCE_ID` constant.

**Detail panel**

- `apps/root/src/app/fitted/(app)/jobs/JobDetailPanel.tsx` (373 lines) — fetches status history + analysis on mount, auto-runs LLM analysis (`useEffect` at line 104), Skeleton during analyzing, status select, delete with `window.confirm`, gates `<ResumeEditor>` and `<CoverLetterSection>` on status.
- `apps/root/src/app/fitted/(app)/jobs/[id]/page.tsx` — **placeholder only**, see F4-A.

**Batch + selection**

- `BatchActionBar.tsx` — selection count, generate / export / delete buttons (see Phase 3 #503/#505 for batch wiring).

**Status management**

- `JobDetailPanel.tsx::updateStatus()` — POST `/api/jobs/{id}/status` with `{status}`.

### Acceptance criteria

| AC                                                      | Status | Evidence                                                                                                       |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Jobs list with score, company, title, status, date      | ✅     | `JobsListTable.tsx:76-80` TARGET_COLUMNS + `ScoreBadge`/`StatusBadge`/`timeAgo`                                |
| Sort/filter/search                                      | ✅     | `JobsListTable` sortable columns + `JobsFilter` (min score / status / search)                                  |
| Click-in panel with loading skeleton → LLM analysis     | ✅     | `JobsListTable` `expandedId` → `<JobDetailPanel>` with auto-analysis + Skeleton (`JobDetailPanel.tsx:104-108`) |
| Batch select with Generate button                       | ✅     | Checkboxes lift `selectedIds` → `BatchActionBar` (Phase 3 #503)                                                |
| Status management from list view                        | 🟡     | Status updates work from inside the expanded `JobDetailPanel`. No quick-status update directly in the row.     |
| Manual entry badge differentiator                       | ✅     | `JobsListTable.tsx:295` — renders "Manual" badge when `source_id === MANUAL_SOURCE_ID`                         |
| Pagination for large job lists                          | ✅     | `JobsListTable` uses `<Pagination>` from shared-ui                                                             |
| `/fitted/jobs/[id]` job detail with LLM analysis (#506) | ❌     | Route is a Skeleton placeholder — see F4-A                                                                     |

### Findings

See **F4-A** (above, primary owner #506).

No additional findings unique to #508. Selection flow, batch operations, status lifecycle, manual badge, pagination, score visualization, and click-in panel are all wired correctly. The single gap is the deep-link route.

### Fixes applied

- **F4-A**: `/fitted/jobs/[id]` is now a real deep-link page. New `JobDetailPage.tsx` (client) fetches `/api/jobs/{id}` (404 → "Job not found" Card; success → header with title, manual badge, company/location, "View original posting" link, then `<JobDetailPanel posting targetId onDelete onStatusChange>` wrapped in a Card). New backend route `GET /jobs/{posting_id}` in `apps/job-api/app/routers/jobs.py` plus matching Next.js proxy in `apps/root/src/app/api/jobs/[id]/route.ts`. The `?target=` searchParam is plumbed through so target-scoped scoring still works on direct visits.

---

## #509 — Target management UI

### Status: ✅ shipped — all ACs met, no findings

### Code map

**List + creation**

- `apps/root/src/app/fitted/(app)/targets/page.tsx` — `/fitted/targets` server component.
- `apps/root/src/app/fitted/(app)/targets/TargetsList.tsx` — fetches `/api/targets/mine` (user-scoped, post-Phase 3), shows fit-score badges, "Suggested targets" cloud, create/activate/deactivate.
- `apps/root/src/app/fitted/(app)/targets/TargetCard.tsx` — card with label, fit score, active toggle.
- `apps/root/src/app/fitted/(app)/targets/CreateTargetModal.tsx` — three creation modes: label only, label + JD text, label + JD URL.

**Detail + editing**

- `apps/root/src/app/fitted/(app)/targets/[id]/page.tsx` + `TargetDetail.tsx` — split between shared "Target Profile" (read-only) and per-user "My Emphasis" (editable).
- `apps/root/src/app/fitted/(app)/targets/[id]/ScoringProfileEditor.tsx` — TagList sub-component for categories/seniority/domain/negative.
- `apps/root/src/app/fitted/(app)/targets/[id]/ReferenceJDList.tsx` + `AddReferenceJDModal.tsx` — manage reference JD corpus.
- `apps/root/src/app/fitted/(app)/targets/[id]/ResumeEmphasisEditor.tsx` — writes per-user `user_targets.resume_emphasis`.

### Acceptance criteria

| AC                                          | Status | Evidence                                                                  |
| ------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| Create target from reference JD URL         | ✅     | `CreateTargetModal.tsx` JD URL field → `POST /api/targets` + reference JD |
| Create target from suggested cloud          | ✅     | `TargetsList.tsx:257` "Suggested targets" section + `handleSuggest`       |
| Edit scoring profile                        | ✅     | `ScoringProfileEditor.tsx` with TagList categories                        |
| Add reference JDs to existing target        | ✅     | `AddReferenceJDModal.tsx` + `ReferenceJDList.tsx`                         |
| Target switcher (v1: single target display) | ✅     | `JobsList.tsx` target tabs (`role="tab"` at line 364-389)                 |
| Delete target with confirmation             | ✅     | Confirmation flow in `TargetCard.tsx`                                     |
| Zero state when no targets exist            | ✅     | Empty state + "Create your first target" prompt                           |

### Findings

None. The targets surface is the most complete part of Phase 4 — Phase 3's data model changes (shared targets + user_targets junction + fit scores + matching) are all reflected in the UI.

---

## Rejected findings

These were initially flagged by code-map exploration but rejected on direct verification.

**~~`window.confirm` in batch delete + single delete is a UX regression~~** — REJECTED. `JobsList.tsx:314` and `JobDetailPanel.tsx:113` both have `/* eslint-disable no-alert -- personal tool */` annotations. This is intentional pragmatism for single-user mode; flag for revisit when multi-user lands.

**~~`DashboardPage.tsx` Document Health card has no error handling~~** — REJECTED. The component handles failure with try/catch + ErrorAlert; the broader concern is the absence of an `error.tsx` boundary, captured in F4-B.

**~~`ConversationChat` modal lacks focus trap~~** — REJECTED. `ConversationChatModal.tsx` uses the shared-ui Modal which provides focus trap + escape handling.

**~~Jobs list "All Jobs" tab disappears when no targets active~~** — REJECTED on re-check. `JobsList.tsx:344-360` shows the no-targets empty state in place of the entire tabs+table block — both the "All Jobs" tab AND the per-target tabs are hidden. This is intentional: no targets means no scoring config, so the "All Jobs" view would show unscored noise. The remediation is the visible "Go to Targets" button.

---

## Triage queue

**Status legend**: ✅ fix · ⏭️ skip · 🔮 defer · 🟡 needs decision

| ID       | Finding                                                                                                 | Effort | Recommendation                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F4-D     | #507 onboarding suggestions silently broken — reads `data.suggestions`, API returns `{matches}` (MAJOR) | S      | ✅ done — parses `data.matches`, surfaces `Existing` badge + fit info, links existing matches via `/link`, creates+links new ones.                                     |
| F4-D-bis | #507 even after F4-D parsing fix, new selections POST `/api/targets` without linking the user           | XS     | ✅ done — `handleCreateSelected` now branches on `is_new` and always POSTs to `/api/targets/{id}/link`.                                                                |
| F4-B     | #506 zero error/not-found boundaries in entire fitted tree                                              | XS     | ✅ done — `(app)/error.tsx` (Sentry-tagged) + `(app)/not-found.tsx` (server) added.                                                                                    |
| F4-A     | #506+#508 `/fitted/jobs/[id]` is a Skeleton placeholder, not wired up                                   | M      | ✅ done — wired up. New `JobDetailPage.tsx`, backend `GET /jobs/{posting_id}`, Next.js proxy GET handler, `?target=` plumbed through.                                  |
| F4-E     | #506 `/fitted` defaults to DashboardPage; spec said "main dashboard (jobs list, default view)"          | XS     | ✅ done — DashboardPage rebuilt as job-focused (top matches + pipeline counts + profile health link). Master Document / Document Health migrated to `/fitted/profile`. |
| F4-C     | #506 DarkModeToggle visible twice on mobile when slide-in panel is open                                 | XS     | ✅ done — removed the top-bar toggle; sidebar footer is the single source of truth.                                                                                    |

### Decisions taken

- **F4-A** — wire up the deep-link detail page (reuse `JobDetailPanel`, plumb `?target=` for target-scoped scoring).
- **F4-B** — add `error.tsx` + `not-found.tsx` to the fitted shell.
- **F4-C** — drop the top-bar DarkModeToggle, keep only the sidebar footer one.
- **F4-D / F4-D-bis** — take the larger fix: parse `data.matches`, surface `existing` badge + fit score, route existing matches through `/api/targets/{id}/link` and create→link new matches.
- **F4-E** — reshape `/fitted` into a job-focused command center (top matches + pipeline counts + small profile-health link). Move Document Health / Master Document machinery to `/fitted/profile` (keeps spec intent — root surface is jobs — without losing the master-doc UX).
