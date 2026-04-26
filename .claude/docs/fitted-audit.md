# Fitted Feature Audit

Audit of current Fitted implementation against the blueprint (`fitted-scope.md`).
Generated 2026-04-26.

## 1. Job Discovery (exists, needs refinement)

| Blueprint Spec                                                | Status    | Notes                                              |
| ------------------------------------------------------------- | --------- | -------------------------------------------------- |
| ATS polling (5 providers + auto-detect)                       | Built     | Greenhouse, Lever, Ashby, SmartRecruiters, Workday |
| Manual entry (paste URL, lightweight extraction)              | Built     | `JobUrlInput` in onboarding, manual entry badge    |
| URL extraction cascade (HTTP -> Firecrawl -> warn)            | Not built | Blueprint #407, Firecrawl fallback missing         |
| Job URL validation (format, redirects, banned sites, content) | Not built | No `services/validate/` implementation visible     |
| Firecrawl fallback for custom career pages                    | Not built | Blueprint #407                                     |

## 2. Scoring & Analysis

| Blueprint Spec                                        | Status    | Notes                                             |
| ----------------------------------------------------- | --------- | ------------------------------------------------- |
| List view keyword score (0-100, 5 categories)         | Built     | Score column in job table, per-target scores      |
| Detail view LLM analysis (scorecard + recommendation) | Built     | `JobDetailPanel` calls `/api/jobs/analysis/[id]`  |
| v2 LLM-powered scoring                                | Not built | Blocked on LLM client stabilization per blueprint |

## 3. Resume Tailoring

| Blueprint Spec                                                    | Status       | Notes                                                     |
| ----------------------------------------------------------------- | ------------ | --------------------------------------------------------- |
| Experience document (single master doc, conversational authoring) | Built        | Prose doc + optimized doc + onboarding conversation       |
| Inline annotations (per-target emphasis/exclusion)                | Not built    | Annotations stored in prose, parsed during derivation     |
| Batch generation (select multiple -> Generate)                    | Built        | `POST /api/jobs/tailor/batch` with progress polling       |
| Default batch size 5, warning above 5                             | Unknown      | Need to verify batch size limits in backend               |
| Draft -> free-text edit -> approve flow                           | Built        | Resume editor modal with save/approve                     |
| Export as .docx (individual)                                      | Not verified | Need to check if download endpoint exists                 |
| Export as bundled zip (select-all)                                | Not built    | Blueprint specifies zip export for multiple resumes       |
| Resume reuse within a target                                      | Not built    | Reference existing resume for similar jobs in same target |
| Resume <-> job attribution (one resume -> many jobs)              | Not verified | Schema may support it, UI unclear                         |
| Page budget (1 page default, configurable)                        | Not verified | Blueprint says "configurable per role"                    |
| One default template, schema supports per-target                  | Not verified |                                                           |
| Cover letters (not v1, architecture must leave room)              | Not built    | Expected -- explicitly deferred                           |

## 4. Job Targets

| Blueprint Spec                                          | Status               | Notes                                                               |
| ------------------------------------------------------- | -------------------- | ------------------------------------------------------------------- |
| Target creation from reference JD (Path 1)              | Built                | `AddReferenceJDModal`, derive-profile endpoint                      |
| Target creation from master document (Path 2)           | Partially built      | `TargetSuggestions` in onboarding, but no "target cloud" in main UI |
| Multiple reference JDs per target                       | Built                | Add/remove reference JDs in target detail                           |
| Scoring profile schema (categorized keywords + weights) | Built                | `ScoringProfileEditor` in target detail                             |
| Resume emphasis per target                              | Built                | `ResumeEmphasisEditor` in target detail                             |
| ATS sources per target (optional)                       | Not built            | Blueprint says some sources may only apply to one target            |
| Reference JDs preserved for audit/re-derivation         | Built                | `ReferenceJDList` with derivation trigger                           |
| Multi-active targets                                    | Built                | Activate/deactivate without exclusivity                             |
| Target-suggested cloud from master doc                  | Not built in main UI | Only in onboarding `TargetSuggestions`                              |
| Zero state (no targets -> guide to create)              | Built                | Jobs page zero state directs to targets                             |

## 5. Application Tracking

| Blueprint Spec                                                | Status          | Notes                                            |
| ------------------------------------------------------------- | --------------- | ------------------------------------------------ |
| Status progression (new -> saved -> ... -> archived)          | Partially built | Status dropdown exists, limited statuses         |
| Expanded lifecycle (resume_draft, resume_ready, interviewing) | Not built       | Blueprint says current statuses "need to expand" |
| Action history (every status change logged with timestamps)   | Not verified    | Backend may log, no UI for viewing history       |
| Interview tracking (single "interviewing" status)             | Not built       | Not in status options                            |
| Insights panel - application velocity                         | Built           | Velocity chart                                   |
| Insights panel - target comparison                            | Built           | Target comparison chart                          |
| Insights panel - skill frequency                              | Built           | Skill frequency chart                            |
| Insights panel - response rates (funnel)                      | Built           | Funnel chart                                     |
| Insights panel - score distribution                           | Built           | Score distribution chart                         |

## 6. Authentication

| Blueprint Spec                                    | Status | Notes                                         |
| ------------------------------------------------- | ------ | --------------------------------------------- |
| Magic link via Supabase Auth                      | Built  | `MagicLinkForm`, OTP flow, callback handler   |
| Admin dashboard separated                         | Built  | Admin at `/tools/admin/`, Fitted at `/fitted` |
| `user_id UUID NULL` on all tables (tenancy hedge) | Built  | Per blueprint #185 plan                       |

## 7. Notifications

| Blueprint Spec                                         | Status    | Notes                                           |
| ------------------------------------------------------ | --------- | ----------------------------------------------- |
| Email alerts (Resend) for high-score jobs              | Not built | Resend integrated in app but not for job alerts |
| SMS/text for great-fit jobs (Twilio)                   | Not built | No Twilio integration                           |
| Score threshold (default, user-adjustable, per-target) | Not built |                                                 |
| Deep link from notification -> job -> generate resume  | Not built |                                                 |

## 8. LLM Cost Visibility

| Blueprint Spec                                      | Status          | Notes                                                    |
| --------------------------------------------------- | --------------- | -------------------------------------------------------- |
| Per-resume generation cost (tokens, model, dollars) | Not verified    | `llm_cost_log` table exists per blueprint                |
| Aggregate cost dashboard                            | Partially built | Skills/cost chart in insights, not a dedicated cost view |

## 9. Master Document Health

| Blueprint Spec                                    | Status  | Notes                                                                            |
| ------------------------------------------------- | ------- | -------------------------------------------------------------------------------- |
| Gap tracking (LLM identifies unfilled slots)      | Built   | Gap tracker + gap-health endpoint                                                |
| Gap percentage (single completeness number)       | Built   | `gap_pct` in `GapHealthResult`                                                   |
| Visual status indicator (5-tier color thresholds) | Partial | 3 tiers (red/yellow/green), blueprint specifies 5 (red/orange/yellow/lime/green) |
| Resume generation gate (45% threshold)            | Partial | UI warns at 50%, blueprint says 45%. Backend gate not verified                   |
| Multiple resume uploads (merge, not replace)      | Built   | Upload handler with `auto_derive=true`                                           |
| Manual editing (copy/paste master doc)            | Built   | Prose editor on dashboard                                                        |
| LLM assist (probing questions to fill gaps)       | Built   | Conversation flow + next-probe endpoint                                          |

## 10. Onboarding

| Blueprint Spec                      | Status             | Notes                                      |
| ----------------------------------- | ------------------ | ------------------------------------------ |
| Path A: Resume + role in mind       | Built              | Upload -> job URL -> targets -> complete   |
| Path B: Resume but exploring        | Built              | Upload -> target suggestions -> complete   |
| Path C: From scratch (conversation) | Built              | Conversation chat -> targets -> complete   |
| Skip button always available        | Not verified       | Need to check UI                           |
| Auto-redirect when no master doc    | Needs verification | Was server-side, now client-side dashboard |

## 11. UI Requirements

| Blueprint Spec     | Status       | Notes                                           |
| ------------------ | ------------ | ----------------------------------------------- |
| Mobile-friendly    | Partial      | Responsive classes used, not verified on mobile |
| Dark mode          | Built        | Theme system exists                             |
| Loading skeletons  | Built        | Skeleton states on all pages                    |
| Optimistic updates | Not verified |                                                 |

## Summary

| Category               | Built | Partial | Not Built |
| ---------------------- | ----- | ------- | --------- |
| Job Discovery          | 2     | 0       | 3         |
| Scoring & Analysis     | 2     | 0       | 1         |
| Resume Tailoring       | 3     | 0       | 5+        |
| Job Targets            | 7     | 1       | 2         |
| Application Tracking   | 1     | 1       | 3         |
| Authentication         | 3     | 0       | 0         |
| Notifications          | 0     | 0       | 4         |
| LLM Cost Visibility    | 0     | 1       | 1         |
| Master Document Health | 5     | 2       | 0         |
| Onboarding             | 3     | 1       | 0         |
