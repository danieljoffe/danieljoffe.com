# Audit Phase 2 — Scoring & Manual Entry

Covers Phase 2 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): manual JD entry, LLM job analysis, target-aware scoring v2.

**Sub-issues:** [#500](https://github.com/danieljoffe/danieljoffe.com/issues/500) · [#501](https://github.com/danieljoffe/danieljoffe.com/issues/501) · [#502](https://github.com/danieljoffe/danieljoffe.com/issues/502)

## Phase summary

| Sub-issue                 | Status     | Headline finding                                                                                                                                                                                                                              |
| ------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #500 Manual JD entry      | ✅ fixed   | Manual badge surfaced in jobs list. Firecrawl failures now append warnings to the response. In-app entry point deferred (see F2-H).                                                                                                           |
| #501 LLM job analysis     | ✅ fixed   | Proxy now forwards `target_id`, backend fetches description by `job_id`, cache key extended to `(job, target, optimized)`. Click-in auto-triggers analysis exactly once per target.                                                           |
| #502 Target-aware scoring | ✅ shipped | Target-specific scoring profiles work end-to-end. Per-target scores stored in `job_target_scores`, list view overlays them, lazy re-scoring via `scored_profile_version` from Phase 5. Manual entry scores against all active targets inline. |

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #500 — Manual JD entry

### Status: ✅ fixed (F2-A, F2-B); 🔮 deferred (F2-H)

### Code map

**Service (`services/`)**

- `extract.py:25` — `MANUAL_SOURCE_ID = "00000000-0000-4000-a000-000000000001"`
- `extract.py:82-112` — `_extract_from_jsonld()` tier 1
- `extract.py:135-178` — `_extract_from_html_meta()` tier 2
- `extract.py:181-214` — `_extract_from_firecrawl()` tier 3 (15s timeout, gated on `settings.firecrawl_api_key`)
- `extract.py:217-235` — `extract_job_from_html()` runs tiers 1+2 sync
- `validate.py` — URL format/banned-domain checks (Phase 0)

**Router**

- `app/routers/jobs.py:316-464` — `POST /jobs/manual`
  - Format validation (line 325)
  - Banned-domain pre-check (line 331)
  - HTTP fetch (line 340)
  - Post-redirect domain check (line 347)
  - Tier 1+2 extraction (line 363)
  - Tier 3 Firecrawl fallback (line 369-372) — **no warning appended on Firecrawl failure**
  - `needs_manual_fields=True` early-return when no title (line 388-396)
  - Insert `source_id=MANUAL_SOURCE_ID` (line 409)
  - Score against all active targets inline (lines 433-452)
  - Cache invalidation (line 455)

**Frontend**

- `apps/root/src/app/fitted/onboarding/JobUrlInput.tsx:53` — only call site for `POST /api/jobs/manual`
- `apps/root/src/app/api/jobs/manual/route.ts:9` — proxy
- **No entry point on `(app)/jobs/` page** — once a user is past onboarding, there is no UI to paste a URL.

**Tests**

- `apps/job-api/tests/test_manual_job.py` — endpoint coverage

### Acceptance criteria

| AC                                                                    | Status | Evidence                                                                                                                                |
| --------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| User pastes URL → metadata extracted → job listed                     | ✅     | `jobs.py:316-464` end-to-end                                                                                                            |
| Cascade: HTTP → Firecrawl → user warning                              | 🟡     | Cascade exists (line 369-372). Firecrawl returning `None` adds no warning (`extract.py:198, 204, 213`). User can't tell it was tried.   |
| Firecrawl has short timeout                                           | ✅     | `extract.py:196` — `timeout=15.0`                                                                                                       |
| Manual entries have visual differentiator                             | ❌     | Backend sets `source_id=MANUAL_SOURCE_ID`, but `JobPosting` type (`jobs/types.ts:17-32`) doesn't include `source_id`. No badge in list. |
| Downstream flow identical to ATS-polled jobs (scoring, batch, resume) | ✅     | `jobs.py:433-452` calls `target_score_and_upsert` + `update_global_score` (same as poller path)                                         |
| API endpoint `POST /jobs/manual`                                      | ✅     | `jobs.py:316`                                                                                                                           |

### Findings

**F2-A: no "manual entry" visual differentiator in the jobs list (AC #4 ❌)**
The backend writes `source_id=MANUAL_SOURCE_ID` on every manual insert (`jobs.py:409`), and `_JP_SELECT_COLS` (`jobs.py:55-59`) does select `source_id`. But the frontend `JobPosting` type at `apps/root/src/app/fitted/(app)/jobs/types.ts:17-32` omits `source_id`, so the UI never sees it. `JobsListTable.tsx` has no manual-vs-polled distinction. Fix is small: add `source_id: string` to the type and render a badge when it equals the manual sentinel.

**F2-B: Firecrawl failures are silent**
At `extract.py:181-214`, three failure paths return `None` (no API key, non-200 response, exception) and the caller at `jobs.py:369-372` simply leaves the original `tier="none"` extraction in place. The user sees `extraction_tier="none"` and `needs_manual_fields=True` but has no way to know Firecrawl was even attempted, let alone why it failed. Fix: append a warning like `firecrawl_unavailable` / `firecrawl_failed:<status>` to the response.

**F2-H: no in-app entry point for manual job entry (out-of-spec UX gap)**
`POST /jobs/manual` is only ever called from `apps/root/src/app/fitted/onboarding/JobUrlInput.tsx:53`. After onboarding, a user looking at `/fitted/jobs` cannot add a job by URL — there is no button, modal, or input field. The feature is functionally inaccessible post-onboarding. Spec doesn't explicitly call this out, but AC #1 ("user pastes URL → metadata extracted → job listed") implies the action should be available from the jobs view. Same `ConversationChatModal` pattern as Phase 1 fixes would work — modal trigger from jobs list header.

### Fixes applied

**F2-A (commit `f5e6006b`)** — added `MANUAL_SOURCE_ID` constant + `source_id: string` to `JobPosting` (`apps/root/src/app/fitted/(app)/jobs/types.ts:17-24`); render `<Badge variant='info'>Discovered</Badge>` next to title in `JobsListTable.tsx` when `job.source_id === MANUAL_SOURCE_ID`. Manual entries are now visually differentiated in the list.

**F2-B (commit `f5e6006b`)** — `_extract_from_firecrawl` now always returns an `ExtractionResult` (never `None`), populating `warnings` on failure: `firecrawl_unavailable` (no API key), `firecrawl_failed:http_<code>` (non-200), `firecrawl_failed:empty_html` / `firecrawl_failed:no_metadata` (parse misses), `firecrawl_failed:exception` (network/timeout). Caller in `jobs.py` extends the response `warnings` from the failed result so the user sees why extraction fell through.

**F2-H (deferred — documented for future targets-page UI)** — no in-app entry point added in this phase. The `POST /jobs/manual` flow is reachable only from onboarding (`JobUrlInput.tsx`). When a future targets-detail page is built, surface a "Add job by URL" affordance there (likely the same `ConversationChatModal` pattern as Phase 1). Backend already accepts standalone calls, no API change needed. Suggested follow-up: extend `POST /jobs/manual` to accept `{label, jd_text}` (paste-mode) in addition to `{url}` and call `targets/match.py::find_matching_target` so manual entries auto-link to a target by label match — but only do this once the targets-page UI exists, otherwise it's dead surface area.

---

## #501 — LLM job analysis

### Status: ✅ fixed (F2-D, F2-E, F2-G)

### Code map

**Service**

- `app/services/analysis/analyze.py:38-69` — `analyze_job()` pure function. System prompt cached.
- `app/services/analysis/prompts.py` — `ANALYSIS_SYSTEM` constant
- `app/services/analysis/persistence.py:19-41` — `get_cached(supabase, job_posting_id, user_id)`. Filters on `job_posting_id` + `user_id`. **Does not filter on `optimized_doc_id`.**
- `app/services/analysis/persistence.py:44-68` — `persist()` insert
- `app/services/llm/cost_log.py:84-102` — `record()` logs to `llm_call_log`

**Router**

- `app/routers/analysis.py:26-87` — `POST /analysis/{job_id}`
  - Cache check (line 34) — `user_id=None` (single-user mode, consistent with rest of codebase)
  - Optimized doc fetch (line 39)
  - Job posting existence check (line 47-56)
  - LLM call (line 59-63) — uses `body.job_description` from request
  - Cost log (line 66-75)
  - Persist (line 78-85)

**Models**

- `app/models/analysis.py:21-28` — `Scorecard` (skills_matched, skills_missing, nice_to_haves, seniority_fit, domain_fit + rationales)
- `app/models/analysis.py:38-50` — `JobAnalysisRecord` (cache row shape; carries `optimized_doc_id`)
- `app/models/analysis.py:53-56` — `AnalyzeRequest` — `job_description: str = Field(min_length=1, max_length=100_000)` ⚠️ **required**

**Frontend**

- `apps/root/src/app/fitted/(app)/jobs/JobDetailPanel.tsx:77-97` — `handleAnalyze()` posts to `/api/jobs/analysis/${posting.id}` with `body: { job_description: '' }`
- `apps/root/src/app/fitted/(app)/jobs/JobDetailPanel.tsx:265-273` — manual "Analyze" button (no auto-trigger on click-in)
- `apps/root/src/app/api/jobs/analysis/[id]/route.ts:13` — `proxyToFastAPI(`/analysis/${id}`, { method: 'POST' })` — **drops the body entirely**
- `apps/root/src/app/api/jobs/proxy.ts:57` — `body: body ? JSON.stringify(body) : null` confirms: when proxy is called without `body`, FastAPI receives `null`

**Tests**

- `apps/job-api/tests/test_analysis.py` — backend coverage

### Acceptance criteria

| AC                                                          | Status | Evidence                                                                                                                                               |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Click-in triggers LLM analysis (loading skeleton → results) | 🟡     | Skeleton wired (`JobDetailPanel.tsx:257`). But analysis is gated behind a manual "Analyze" button (line 269) — no auto-trigger on click-in.            |
| Scorecard with structured breakdown                         | ✅     | `analysis.py:21-28` matches the spec's structured breakdown                                                                                            |
| One-line recommendation                                     | ✅     | `JobAnalysis.recommendation: str` (`analysis.py:35`)                                                                                                   |
| Analysis cached per job (don't re-run on repeat views)      | 🟡     | `persistence.get_cached()` exists but only filters on `(job_posting_id, user_id)` — never invalidates when `optimized_doc_id` changes. **Stale risk.** |
| Cost logged to `llm_cost_log`                               | ✅     | `analysis.py:66-75`                                                                                                                                    |
| Graceful degradation if no master document exists           | ✅     | `analysis.py:40-44` — 404 with actionable error message                                                                                                |

### Findings

**F2-E: analysis endpoint cannot be called from the frontend (MAJOR)**
`/api/jobs/analysis/[id]/route.ts:13` calls `proxyToFastAPI('/analysis/${id}', { method: 'POST' })` with **no body argument**. The proxy at `proxy.ts:57` then sends `body: null`. FastAPI's `AnalyzeRequest.job_description` requires `min_length=1` (`analysis.py:56`), so every request fails Pydantic validation with a 422 before `analyze_job()` is even reached. The "Analyze" button in `JobDetailPanel.tsx` has been broken since merge.

The cleaner fix: the backend already has the `job_id`. It can fetch `description_html` from the `job_postings` table itself (it already verifies the row exists at `analysis.py:47-56`). Drop `AnalyzeRequest.job_description` entirely and remove the dead body from the frontend. This also aligns with the "graceful degradation" AC — the backend can return a clearer error if the job has no description.

**F2-D: analysis cache returns stale results when the master doc changes**
`persistence.get_cached()` orders by `created_at DESC` and filters only on `(job_posting_id, user_id)`. The `optimized_doc_id` column is written on insert (`persistence.py:57`) but never read. So if a user updates their master doc, runs derivation, and revisits a job they already analyzed, they will see the analysis computed against their **old** master doc. There is no invalidation hook in `derive.py` or anywhere in the experience pipeline that touches `job_analyses`.

Two clean fixes:

- Filter the cache query on `optimized_doc_id == current_optimized.id` (returns None if mismatch, triggering a fresh analysis).
- Or: drop the cache row when a new optimized doc is created. Less work at read time but couples the experience module to job analyses.

The first option keeps modules decoupled and is the natural reading of "cache" — same key, same answer; key includes the inputs.

**F2-G: click-in does not auto-trigger analysis (AC #1 🟡)**
The spec describes "click-in triggers LLM analysis (loading skeleton → results)" as a one-step flow. The actual UX requires the user to click into a job AND then click an "Analyze" button (`JobDetailPanel.tsx:265-273`). The current pattern is **defensible** — burning $0.03+ on every accidental click would be wasteful — but it diverges from spec. Worth a triage decision: keep the manual button (cost-conscious), or auto-trigger (spec-faithful), or auto-trigger only when cache miss + master doc exists (best of both).

### Fixes applied

**F2-E (commit `12b8e7ae`)** — endpoint signature changed from `POST /analysis/{job_id}` (with `AnalyzeRequest` body) to `POST /analysis/{job_id}?target_id=...` (no body). Backend fetches `description_html` from `job_postings` by `job_id` itself; returns 404 if the job is missing and 422 if it has no description. `AnalyzeRequest` model deleted entirely. The frontend proxy at `apps/root/src/app/api/jobs/analysis/[id]/route.ts` extracts `target_id` from the request URL and forwards via `proxyToFastAPI(..., { searchParams })`. The "Analyze" button now actually works.

**F2-D (this commit)** — analysis cache key extended from `(job_posting_id, user_id)` to `(job_posting_id, target_id, optimized_doc_id)`. Schema migration `20260428120000_add_target_id_to_job_analyses.sql` `TRUNCATE`s the table (safe — derived cache, regenerates from LLM), adds `target_id UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE`, drops the old `idx_job_analyses_user_job` index and replaces it with `idx_job_analyses_cache_key(job_posting_id, target_id, optimized_doc_id)`. `persistence.get_cached` and `persistence.persist` both take `target_id` as a required keyword. The poller's stage-3 LLM scoring now picks `active_targets[0]` as the canonical target for its cache row, and re-uses it via the same key when the user views the job under that target. `JobAnalysisRecord` model gains `target_id: str`.

**F2-G (this commit)** — `JobDetailPanel` now takes a `targetId: string | undefined` prop (passed from `JobsListTable`). A `useEffect` auto-triggers `runAnalysis()` exactly once on first open when (a) a target is selected and (b) no analysis/error is in flight. The cache key change in F2-D means a cache hit returns instantly; a cache miss runs the LLM exactly once per `(job, target, optimized version)`. When no target is selected the panel shows "Select a target to see analysis for this job." instead of running. The manual "Retry analysis" button is preserved for error recovery.

---

## #502 — Target-aware scoring v2

### Status: ✅ shipped

### Code map

**Service**

- `app/services/scoring.py:195-201` — `score_job_with_profile(title, description_html, profile)` — accepts a `ScoringProfile` parameter (not the global config). Stage 2 entry point.
- `app/services/scoring.py:342` — `score_title_against_profile()` — stage 1 (title-only).
- `app/services/target_scoring.py:1-260` — per-target scoring orchestration:
  - `_upsert_score()` (line 56-91) — writes `job_target_scores` with `scored_profile_version`
  - `score_title_and_upsert()` (line 93-136) — stage 1 inline
  - `score_and_upsert()` (line 138-200) — stage 2 async
  - `bulk_score_for_target()` (line ~155-200) — re-scores rows where `scored_profile_version < target.profile_version` (lazy re-scoring from Phase 5)
  - `list_jobs_with_target_overlay()` (line ~226-260) — list view overlay
  - `update_global_score()` — averages across active targets

**Router**

- `app/routers/jobs.py:467+` — `POST /rescore/{target_id}` — full re-score for a target
- `app/routers/jobs.py:235-313` — list endpoint uses `get_target_jobs` RPC for per-target overlay

**DB**

- `job_target_scores` — primary key `(job_posting_id, target_id)`. Carries `scored_profile_version` for lazy re-scoring.

**Tests**

- `apps/job-api/tests/test_scoring_with_profile.py` — 11 tests
- `apps/job-api/tests/test_target_scoring.py` — overlay + per-target list tests

### Acceptance criteria

| AC                                                    | Status | Evidence                                                                                                             |
| ----------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Scoring accepts a profile parameter (not just global) | ✅     | `scoring.py:195` — `score_job_with_profile(title, description_html, profile: ScoringProfile)`                        |
| Jobs scored per-target during polling                 | ✅     | `target_scoring.score_title_and_upsert` (stage 1, inline) + `score_and_upsert` (stage 2, async). Poller calls these. |
| List view shows target-specific score                 | ✅     | `list_jobs_with_target_overlay()` + `get_target_jobs` RPC                                                            |
| Fallback to global scoring when no target selected    | ✅     | `_JP_SELECT_COLS` includes `score, score_breakdown` (the global average); list works without `target_id` filter      |
| Existing tests updated for parameterized scoring      | ✅     | `test_scoring_with_profile.py` covers the parameterized path                                                         |

### Findings

_(none — all ACs satisfied. Lazy re-scoring via `scored_profile_version` was added in Phase 5 and is correctly invoked by manual entry, polling, and the rescore endpoint.)_

### Fixes applied

_(N/A — no findings)_

---

## Rejected findings

These were initially flagged by code-map exploration but rejected on direct verification.

**~~F2-C: analysis cache shares rows across users (`user_id=None`)~~** — REJECTED. This is the consistent single-user mode pattern across the whole experience pipeline (`prose`, `optimized`, `preferences`, `turns` all pass `user_id=None`). Will become a real issue when multi-user lands, but is not specific to #501 and is tracked under multi-user migration, not Phase 2.

**~~F2-F: target scoring profile version not validated~~** — REJECTED. Lazy re-scoring is implemented at `target_scoring.py:174` (filters `scored_profile_version < target.profile_version`) and `target_scoring.py:219` (writes current profile version on upsert). Phase 5 of the original plan added this and it survives.

---

## Triage queue

**Status legend**: ✅ fixed · 🔮 deferred · ⏭️ skipped

| ID   | Finding                                                              | Effort | Resolution                                                                                                                                      |
| ---- | -------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| F2-A | #500 no "manual entry" badge in jobs list (AC #4 ❌)                 | S      | ✅ fixed (`f5e6006b`) — `Discovered` badge surfaced when `source_id === MANUAL_SOURCE_ID`.                                                      |
| F2-B | #500 Firecrawl failures are silent                                   | XS     | ✅ fixed (`f5e6006b`) — Firecrawl failures append `firecrawl_failed:<reason>` warnings to the response.                                         |
| F2-D | #501 analysis cache stale on master-doc change (AC #4 🟡)            | XS     | ✅ fixed — cache key extended to `(job, target, optimized)`; schema migration `20260428120000_add_target_id_to_job_analyses.sql` enforces it.   |
| F2-E | #501 analysis endpoint broken end-to-end — proxy drops body (MAJOR)  | S      | ✅ fixed (`12b8e7ae`) — endpoint takes `?target_id=...`, backend fetches JD by `job_id`. `AnalyzeRequest` deleted.                              |
| F2-G | #501 click-in doesn't auto-trigger analysis (AC #1 🟡)               | XS-S   | ✅ fixed — `useEffect` auto-triggers `runAnalysis` once when a target is selected; cache key change in F2-D guarantees one LLM call per target. |
| F2-H | #500 no in-app entry point for manual job entry (out-of-spec UX gap) | S      | 🔮 deferred — defer to future targets-detail page UI; documented above so the affordance + label-match auto-link aren't lost.                   |
