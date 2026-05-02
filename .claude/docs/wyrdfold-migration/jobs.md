# Jobs Surface — Wyrdfold Migration Audit

Issue: #585 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

The jobs surface is the **largest** Fitted feature: 14 files /
~2,563 LOC. It splits into three sub-surfaces:

1. **List + filter** (`JobsList.tsx`, `JobsListTable.tsx`,
   `JobsFilter.tsx`, `BatchActionBar.tsx`) — ~985 LOC
2. **Detail panel + page** (`JobDetailPanel.tsx`,
   `[id]/JobDetailPage.tsx`, `CoverLetterSection.tsx`) — ~768 LOC
3. **Resume review** (`[id]/resume/ResumeReviewPage.tsx`) — 503 LOC

Plus shared `types.ts` (195 LOC) — the **canonical TypeScript
contract** for the jobs ↔ tailor ↔ resume domain (JobPosting,
Scorecard, TailoredResumeRecord, ResumeVersion, LintViolation).

This surface heavily depends on the other session's in-flight
work (apps/job-api/services/llm/\* + tailor.py + batch.py +
markdown-it pipeline). **Collision notes** below.

## 1. Surface inventory

```
apps/root/src/app/fitted/(app)/jobs/
├── page.tsx                 40   server: passes ?target=X to JobsList
├── loading.tsx              19
├── types.ts                195   JOB_STATUSES + 12 interfaces (JobPosting, Scorecard, TailoredResumeRecord, ...)
├── JobsList.tsx            466   client: list shell (target switcher, batch actions, suggestions)
├── JobsListTable.tsx       351   client: table — uses useAdminTableFetch hook
├── JobsFilter.tsx           65   client: minScore + status + search filters
├── BatchActionBar.tsx      105   client: bottom bar (mobile-aware)
├── JobDetailPanel.tsx      362   client: side panel (status history, scorecard)
├── CoverLetterSection.tsx  247   client: cover letter generate/list/download
└── [id]/
    ├── page.tsx              21  server: renders JobDetailPage
    ├── loading.tsx           20
    ├── JobDetailPage.tsx    154  client: full-page detail
    └── resume/
        ├── page.tsx          15
        └── ResumeReviewPage.tsx 503   client: markdown editor + tailor review + lint
```

## 2. API endpoints consumed (~21)

```
# List + detail
GET    /api/jobs                              → list (used via useAdminTableFetch)
GET    /api/jobs/[id]                         → detail
DELETE /api/jobs/[id]                         → delete (single + batch)
GET    /api/jobs/[id]/status                  → status read
POST   /api/jobs/[id]/status                  → status update
GET    /api/jobs/[id]/status-history          → audit trail
GET    /api/jobs/analysis/[id]?target_id=X    → scorecard

# Tailor (resume)
POST   /api/jobs/tailor/resume                → kick off tailor (re-adapt)
POST   /api/jobs/tailor/batch                 → batch-tailor selected jobs
GET    /api/jobs/tailor/batch/[id]            → poll batch status
GET    /api/jobs/tailor/by-job/[id]           → fetch tailored record by job
GET    /api/jobs/tailor/[id]                  → fetch by tailor ID
PATCH  /api/jobs/tailor/[id]                  → save markdown edits
POST   /api/jobs/tailor/[id]/approve          → approve final
GET    /api/jobs/tailor/[id]/download         → download docx/pdf
GET    /api/jobs/tailor/[id]/versions         → version history
POST   /api/jobs/tailor/export-zip            → batch export

# Cover letter
GET    /api/jobs/tailor/cover-letters         → list
POST   /api/jobs/tailor/cover-letter          → generate

# Cross-link
GET    /api/targets/mine                      → target switcher
GET    /api/targets/[id]/status
POST   /api/targets/[id]/activate
```

All proxy to `apps/job-api` per #590. The full set (26 jobs +
some targets) is the largest BFF footprint of any Fitted surface.

## 3. Hardcoded /fitted paths

```
JobsList.tsx:94, :171, :171   '/fitted/jobs', `/fitted/jobs?target=${id}`
JobsList.tsx:374              '/fitted/targets'
JobDetailPanel.tsx:299, :314  '/fitted/jobs/${id}/resume'
JobsListTable.tsx:307         '/fitted/jobs/${id}/resume'
[id]/JobDetailPage.tsx:54     '/fitted/jobs'
[id]/JobDetailPage.tsx:82     '/fitted/jobs'
[id]/JobDetailPage.tsx:109    '/fitted/jobs'
[id]/resume/ResumeReviewPage.tsx:167  '/fitted/jobs/${jobPostingId}'
[id]/resume/ResumeReviewPage.tsx:266, :293  '/fitted/jobs/${jobPostingId}'
```

11 occurrences across 5 files. All trivial substitutions.

## 4. Domain-types contract (`types.ts`)

This is the **most-load-bearing** type surface in the migration.
It mirrors the job-api Pydantic models in
`apps/job-api/app/models/`. Any rename or shape change must
ripple through both repos:

```ts
JOB_STATUSES = ['new', 'saved', 'resume_draft', 'resume_ready',
                'applied', 'interviewing', 'offer', 'rejected', 'archived']

ScoringStatus = 'stage1' | 'stage2' | 'complete'

MANUAL_SOURCE_ID = '00000000-0000-4000-a000-000000000001'  ← MUST match job-api/services/extract.py

JobPosting          {id, external_id, source_id, title, company_name, location, score, score_breakdown, scoring_status, status, salary_text, ...}
JobsFilterState     {minScore, status, search}
SkillMatch          {name, matched, confidence, evidence}
Scorecard           {skills_matched, skills_missing, nice_to_haves, seniority_fit, domain_fit, ...}
TailoredResumeRecord  ...
ResumeVersion       ...
LintViolation       ...
TailorResponse      ...
ResumeVersionsResponse  ...
```

**Wyrdfold action:** copy `types.ts` verbatim. Generate from
job-api OpenAPI as a follow-up (covered in #591 ADR — fork-then-share).

## 5. shared-ui usage

| Component             | Usage count                                                             |
| --------------------- | ----------------------------------------------------------------------- |
| `Skeleton`            | ResumeReviewPage, JobsList, JobsListTable, JobDetailPanel, [id]/loading |
| `Badge`               | JobsListTable, JobDetailPanel, ResumeReviewPage                         |
| `Text`, `Heading`     | every file                                                              |
| `Card`, `CardContent` | JobsList                                                                |
| `Spinner`             | JobsList, JobsListTable                                                 |
| `Pagination`          | JobsListTable                                                           |

All shared-ui-bound, no app-local UI primitives needed beyond
`@/components/Button` + `@/state/Toast/ToastProvider` + `@/lib/cn`.

## 6. Custom hook: `useAdminTableFetch`

`JobsListTable.tsx:10` imports `useAdminTableFetch` from
`@/hooks/useAdminTableFetch`. This is a **shared admin table hook**
also used by audit-tool admin tables (in `(audit)/dashboard`).

It encapsulates:

- pagination state (page, pageSize)
- sort column + direction
- filter state passthrough
- debounced fetch via `useEffect`

**Wyrdfold action:** the hook is product-agnostic — copy it to
`apps/wyrdfold/src/hooks/`. Consider promotion to `libs/shared/ui`
later (only after the audit-tool admin and Wyrdfold both consume
it from the same place — Rule of Three not yet met since they're
in the same app today).

## 7. Resume editor — the largest single component

`ResumeReviewPage.tsx` (503 LOC) is:

- a markdown editor (`<textarea>` with content state)
- a lint warnings panel (uses `LintViolation` shape)
- a version history dropdown
- approve / re-adapt / download triggers
- a "save before download" guard (referenced in commit
  `96b97daf fix(fitted): resume review page renders + always-available regen + save-before-download`)

This is a **single-file behemoth** — extracting subcomponents
(EditorPane, LintPanel, VersionDropdown, ActionBar) is a worthy
refactor but **out of scope** for the migration. Port as-is.

It depends on `LintViolation` and `ResumeVersion` types — both
shaped by `apps/job-api/services/lint.py` and the markdown
pipeline (`apps/job-api/services/markdown.py`). The other
session's in-flight work (commit `47ff4c58 feat(job-api):
markdown source-of-truth foundation`) materially affects this
file's data flow.

## 8. Cross-surface coupling

- **Targets ↔ Jobs:** the `?target=X` query param drives the
  table filter in JobsList. This is the only deep-link contract
  with the targets surface (#584).
- **Profile/Settings ↔ Jobs:** none direct. The resume editor
  pulls master-doc context indirectly through job-api LLM calls.
- **Insights ↔ Jobs:** insights pulls aggregate over jobs but
  doesn't share UI components.
- **Onboarding ↔ Jobs:** path A's "add a job" step posts via
  `/api/jobs/manual` and redirects to `/fitted/jobs`. The
  redirect is the only contract.

## 9. Tests + E2E

```
$ find apps/root/src/app/fitted/(app)/jobs -name '*.test.tsx'
(no results)
```

**Zero unit tests.** Highest-stakes coverage gap of any audited
surface — the resume editor is mutation-heavy, has lint logic,
and has approve/download side effects. Flagged for #594.

E2E tests:

```
$ rg "fitted/jobs" apps/root-e2e/src
```

Need to verify in #594 — preliminary scan shows minimal E2E
coverage for the resume editor.

## 10. Wyrdfold port checklist

- [ ] Copy 14 files from `apps/root/src/app/fitted/(app)/jobs/`
- [ ] Copy `types.ts` verbatim (canonical contract — see §4)
- [ ] Copy `useAdminTableFetch` hook
- [ ] Substitute 11 hardcoded `/fitted/...` paths
- [ ] Re-wire to wyrdfold's `/api/jobs/*` and `/api/targets/*`
- [ ] Verify `MANUAL_SOURCE_ID` constant matches the wyrdfold-api
      `services/extract.py` value (port together)
- [ ] Add unit tests — minimum: JobsListTable filter/sort, status
      mutations, ResumeReviewPage save/approve flow, batch tailor
      flow
- [ ] Playwright spec: full lifecycle (target → job → resume →
      approve → download)
- [ ] Verify Pyre theme readability — JobsListTable Badges encode
      score thresholds (low/medium/high), check chartreuse contrast

## 11. Open questions

1. **Markdown-source-of-truth pipeline.** The other session
   (commit `47ff4c58`) is wiring markdown as the canonical resume
   format end-to-end. Wyrdfold inherits the new pipeline — verify
   `payload_md` field is included in `TailoredResumeRecord` after
   the fitted branch lands.
2. **Batch action UX on Pyre.** `BatchActionBar` is fixed at
   bottom on mobile (recent commit `6a654157 fix(fitted): mobile
batch action bar layout + clearance`). Re-check on Pyre theme
   for contrast against near-black bg.
3. **Resume editor refactor scope.** ResumeReviewPage at 503 LOC
   is a clear extract-to-subcomponents candidate. Defer past
   migration to avoid coupling refactor + port risks.
4. **Status-history UX.** JobDetailPanel pulls status history and
   shows it inline — if Wyrdfold expands the status set (e.g.,
   "phone screen", "technical interview"), the rendering would
   need updating.

## 12. Decision summary

| Question                        | Answer                                                                     |
| ------------------------------- | -------------------------------------------------------------------------- |
| Files to port                   | 14 (~2,563 LOC)                                                            |
| API endpoints                   | ~21 (largest BFF footprint)                                                |
| Domain-type contract            | `types.ts` — copy verbatim, must stay in sync with job-api Pydantic models |
| External deps beyond shared-ui? | None                                                                       |
| Custom hooks to copy            | `useAdminTableFetch`                                                       |
| `/fitted` path substitutions    | 11 hits across 5 files                                                     |
| Test coverage                   | **Zero** — highest-stakes gap of any surface                               |
| Refactor candidate              | `ResumeReviewPage.tsx` (503 LOC); **defer**                                |

## 13. Collisions

⚠️ **Active collision risk.** The other session is editing:

- `apps/job-api/app/routers/tailor.py`
- `apps/job-api/app/services/batch.py`
- `apps/job-api/app/services/llm/{anthropic_client,client,mock}.py`
- `apps/job-api/app/services/tailor/persistence.py`

These power the **tailor + batch endpoints** that the jobs
surface consumes (`/api/jobs/tailor/*`). The frontend audit
itself doesn't touch any of these files — **no direct merge
conflict**. But:

- The TS types (`TailoredResumeRecord`, `ResumeVersion`,
  `LintViolation`) may need updates when the markdown pipeline
  lands. Worth a follow-up TypeScript-vs-Pydantic-sync pass after
  fitted-ui-refinements merges.
- E2E tests added for resume review will run against the new
  markdown pipeline — verify after the other session's branch
  lands.

This audit modifies docs only, no source files — **safe to merge
into chore/fitted-ui-refinements alongside in-flight work**.
