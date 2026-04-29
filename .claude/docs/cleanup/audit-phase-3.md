# Audit Phase 3 — Resume Pipeline

Covers Phase 3 of [#493](https://github.com/danieljoffe/danieljoffe.com/issues/493): batch resume generation, resume reuse within targets, draft → edit → approve → export.

**Sub-issues:** [#503](https://github.com/danieljoffe/danieljoffe.com/issues/503) · [#504](https://github.com/danieljoffe/danieljoffe.com/issues/504) · [#505](https://github.com/danieljoffe/danieljoffe.com/issues/505)

## Phase summary

| Sub-issue                  | Status   | Headline finding                                                                                                                                                                                                                                                                              |
| -------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #503 Batch generation      | ✅ fixed | Contact resolution moved server-side via Settings → Profile (F3-A). Frontend drops `contact` from the body; backend reads `user_profiles` and 400s with a remediation message when name is missing. Batch progress now shows live "n of N" counter in the action bar (F3-B).                  |
| #504 Resume reuse          | ✅ fixed | Detection unchanged (keyword Jaccard ≥ 0.70). Re-adapt is now opt-in: clone defaults free + zero-cost; user clicks "Re-adapt with AI" in the editor to regenerate (F3-E pivot — wires existing `force_fresh: true`). Reused resumes show provenance banner + always-on metadata block (F3-G). |
| #505 Draft → edit → export | ✅ fixed | Edit + approve + export all wired and exercised end-to-end. Version history persists last 5 snapshots in `tailored_resume_versions` (F3-H, FIFO prune in Python). "Export approved" only enables when selection actually has approved resumes (F3-I).                                         |

**Open triage decisions** (for the user): see [Triage queue](#triage-queue) at the bottom.

---

## #503 — Batch resume generation

### Status: ❌ broken end-to-end

### Code map

**Service**

- `app/services/batch.py:38-59` — `create_batch()` inserts `batch_jobs` row with `status="pending"`
- `app/services/batch.py:62-67` — `get_batch()` reads by id
- `app/services/batch.py:97-236` — `process_batch()` runs sequentially, updates row after each item, calls `find_reusable_resume` first then `run_tailor_pipeline`. Sets `job_postings.status = "resume_draft"` after each item.
- `app/services/tailor/pipeline.py:68-163` — `run_tailor_pipeline()` orchestrates LLM → render → lint → persist. Lint failures short-circuit (no persist).
- `app/services/llm/cost_log.py` — cost recorded per LLM call with `optimized_doc_id`/`job_posting_id` metadata.

**Router**

- `app/routers/tailor.py:459-528` — `POST /tailor/batch` — verifies all job IDs exist, fetches descriptions + target_id (from first posting), kicks off `BackgroundTasks.add_task(process_batch, ...)`, returns `BatchResponse{batch_id, total, status, warnings}` immediately.
- `app/routers/tailor.py:531-540` — `GET /tailor/batch/{batch_id}` — returns full `BatchJob` with item-level state.

**Models**

- `app/models/batch.py:11-19` — `BatchItem(job_posting_id, status, resume_record_id, reused_from, error)`
- `app/models/batch.py:36-44` — `BatchRequest(job_posting_ids[1..20], contact: ContactInfo, resume_type, page_budget, force_fresh)`
- `app/models/tailor.py:28-38` — `ContactInfo` — `name: str` is **required**, others optional.

**Schema**

- `supabase/migrations/20260424120007_create_batch_jobs.sql` — `batch_jobs` table with `items JSONB`, `completed/failed/total` counters, status CHECK constraint.
- `supabase/migrations/20260425120001_resume_lifecycle.sql:9-12` — `job_postings.status` CHECK now includes `resume_draft`, `resume_ready`.

**Frontend**

- `apps/root/src/app/fitted/(app)/jobs/JobsList.tsx:166-235` — `handleBatchGenerate()` sends `contact: {}` (line 175), polls `/api/jobs/tailor/batch/{id}` every 3s but only checks `status === 'completed' | 'failed'`.
- `apps/root/src/app/fitted/(app)/jobs/BatchActionBar.tsx:1-89` — selection bar with `BATCH_WARN_THRESHOLD=5`, `BATCH_MAX=20`, generate/export/delete buttons.
- `apps/root/src/app/api/jobs/tailor/batch/route.ts` — proxy.

**Tests**

- `apps/job-api/tests/test_batch.py` — 570 lines. Uses `_CONTACT = ContactInfo(name="Daniel Joffe", email="d@example.com")` (line 35) — every test paths a populated contact, so the empty-contact regression is invisible to the suite.

### Acceptance criteria

| AC                                       | Status | Evidence                                                                                                                                                                                   |
| ---------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Multi-select jobs in list view           | ✅     | `JobsListTable.tsx:128-149` checkbox + `selectedIds` lifted to `JobsList.tsx:46`                                                                                                           |
| Generate button with batch count         | ✅     | `BatchActionBar.tsx:41-67` — "{N} selected" + "Generate resumes"                                                                                                                           |
| Warning when batch > 5                   | ✅     | `BatchActionBar.tsx:33-50` — `BATCH_WARN_THRESHOLD = 5`                                                                                                                                    |
| Background processing for large batches  | ✅     | `tailor.py:507-521` — `BackgroundTasks.add_task(process_batch, ...)` returns immediately                                                                                                   |
| Progress indicator (X of Y complete)     | 🟡     | Backend tracks `completed/failed/total`. Frontend poll fetches body but only branches on `status` — no live "3 of 5 done" UI shown to user.                                                |
| Each resume created as draft, attributed | ❌     | Cannot create resumes — `contact: {}` 422s before persist. **Code path is correct otherwise**: `batch.py:209-214` upserts `job_postings.status="resume_draft"` after each successful item. |
| Job status advances to `resume_draft`    | ❌     | Same — blocked on the contact bug. Code at `batch.py:175,209` correctly sets `resume_draft` for both reuse and full-generation paths.                                                      |
| LLM costs logged per resume              | ✅     | `pipeline.py:111-120` — `cost_log.record()` with metadata. Reuse path at `reuse.py:133-136` writes `cost_usd=0` and zero tokens.                                                           |

### Findings

**F3-A: batch endpoint 422s on every UI request — `contact: {}` against required `ContactInfo.name` (MAJOR — analog of Phase 2 F2-E)**
`JobsList.tsx:175` sends `contact: {}` in the POST body. `BatchRequest.contact: ContactInfo` (`app/models/batch.py:40`) requires `name: str` (`app/models/tailor.py:33`). Pydantic 422s before the handler runs. There is **no UI anywhere in the app to capture user contact info** — checked `/fitted/profile`, `/fitted/settings`, `/fitted/onboarding`. `OptimizedPayload` and `PreferencesPayload` also carry no contact. The whole tailor flow has been broken since merge — no resume has ever been generated from the UI.

The clean fix is the same shape as F2-E: backend has access to user state (single-user mode → `user_id=None` → use a sentinel "self" contact stored in settings or preferences). Two options:

- **A**: add a `user_contact` table/column and a small Profile UI to fill it once. Backend reads it server-side. Drop `contact` from `BatchRequest`/`TailorRequest`/`CoverLetterRequest`.
- **B**: extend `PreferencesPayload` to include an optional `contact: ContactInfo`. Onboarding's `ResumeUploader` already extracts the user's name from the resume — we could backfill it there.

**F3-B: progress indicator is binary, not item-level (AC #5 🟡)**
Backend `BatchJob.completed`/`failed`/`total` are correctly maintained — `_update_batch()` at `batch.py:227-233` writes the counters after every item. But `JobsList.tsx:201-227` only branches on `batch.status`, never reads `batch.completed/total` to render "3 of 5 done". The fix is small: render a progress badge in `BatchActionBar` (or a toast that updates) using `completed/total` from each poll.

**F3-C: All Jobs batch silently uses first job's target for reuse (low-risk gotcha)**
`tailor.py:496` — `target_id = postings[0].get("target_id")`. If a user multi-selects in the All Jobs tab and the selection spans multiple targets, only the first job's target drives reuse-checking and keyword loading. The other jobs may share resumes inappropriately or miss valid reuse opportunities. Today the UI defaults to a target tab + filters, so this is a corner case, but worth either restricting multi-select to within-tab or doing per-job target resolution in the loop.

**F3-D: `BATCH_MAX=20` hardcoded in two places (cosmetic)**
Frontend `BatchActionBar.tsx:7` and backend `BatchRequest.job_posting_ids = Field(max_length=20)` (`batch.py:39`). Fine for now; revisit if the limit ever needs to change.

### Fixes applied

- **F3-A** ✅ — Added 4 identity columns (`name`, `location`, `linkedin_url`, `website_url`) to existing `user_profiles` table (re-using the SMS-notifications table rather than introducing a new one). New `GET/PATCH /profile/identity` router + `app/services/tailor/contact.py::resolve_contact()` precedence: request-body override (if name present) → `user_profiles` row → `HTTPException(400)` with remediation message "No contact name on file. Set your name in Settings → Profile…". `TailorRequest.contact`/`CoverLetterRequest.contact`/`BatchRequest.contact` flipped to `Optional`. Frontend `Settings → Profile` card captures the fields once. `JobsList.tsx` and `CoverLetterSection.tsx` no longer send `contact: {}`. 5 backend tests in `test_tailor_contact.py`.
- **F3-B** ✅ — `JobsList.tsx::handleBatchGenerate()` polls and tracks `batchProgress = {completed: completed+failed, total}` while the batch runs; `BatchActionBar.tsx` shows "Generating 3 of 7…" instead of just "Generating…" via the `generatingLabel` derivation.
- **F3-C** 🔮 — deferred per triage; still uses `postings[0].target_id`. Documented as a corner-case gotcha for multi-target selection.
- **F3-D** ⏭️ — skipped per triage (cosmetic, both sides are clear).

---

## #504 — Resume reuse within targets

### Status: 🟡 partial — detection works, "adaptation" is literal cloning

### Code map

**Service**

- `app/services/tailor/reuse.py:23` — `SIMILARITY_THRESHOLD = 0.70`
- `app/services/tailor/reuse.py:26-34` — `extract_profile_keywords(profile)` returns lowercased keyword set from a `ScoringProfile`'s categories.
- `app/services/tailor/reuse.py:43-58` — `jd_similarity(jd_a, jd_b, keywords)` — Jaccard over keyword hits in each JD.
- `app/services/tailor/reuse.py:61-106` — `find_reusable_resume(supabase, target_id, job_description, keywords)` queries up to 10 most-recent resumes within the target, returns the best match above threshold.
- `app/services/tailor/reuse.py:109-139` — `clone_resume_for_job()` inserts a new `tailored_resumes` row with the **same payload** + same `storage_path` + `warnings: [..., "reused_from_similar_job"]` + `source_resume_id` lineage. **Zero LLM call.**

**Router/orchestration**

- `app/routers/tailor.py:99-142` — single `POST /tailor/resume` runs reuse check before pipeline.
- `app/services/batch.py:147-187` — same logic in batch loop. Reuse path skips full pipeline, sets `job_postings.status = "resume_draft"`, increments `completed`.

**Schema**

- `supabase/migrations/20260425120000_add_resume_reuse_columns.sql` — adds `source_resume_id UUID` FK on `tailored_resumes`.

**Frontend**

- `apps/root/src/app/fitted/(app)/jobs/JobsList.tsx:174-178` — sends `force_fresh` not set (defaults `false`). No UI toggle for "force fresh" anywhere; user cannot opt out of reuse.
- No surface in `JobDetailPanel`/`ResumeEditor` shows that a resume was reused or which source it cloned.

**Tests**

- `apps/job-api/tests/test_reuse.py` — 281 lines, 100% coverage on `reuse.py`.

### Acceptance criteria

| AC                                                           | Status | Evidence                                                                                                                                                                                          |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| System detects existing resumes in same target               | ✅     | `reuse.py:61-106`                                                                                                                                                                                 |
| Similarity check between JDs                                 | ✅     | `reuse.py:43-58` — Jaccard on profile keyword hits                                                                                                                                                |
| High-similarity path: adapt existing resume (small LLM call) | ❌     | `clone_resume_for_job()` is a literal payload copy. **No LLM call**, no new-job-specific edits. The cloned resume mentions the original company in summary/bullets unless they happen to overlap. |
| Low-similarity path: full generation from master doc         | ✅     | Falls through to `run_tailor_pipeline()` when no match above threshold.                                                                                                                           |
| Resume can be attributed to multiple jobs                    | ✅     | New `tailored_resumes` row per job, lineage via `source_resume_id`.                                                                                                                               |
| User can override and force fresh generation                 | 🟡     | Backend supports `force_fresh: bool = False` (`batch.py:43`, `tailor.py:100`). **No UI toggle exists** — every UI-driven request takes the default path.                                          |

### Findings

**F3-E: "adaptation" is literal cloning, not LLM tweaks (spec divergence)**
The spec says: "**High similarity**: Adapt the existing resume (faster, cheaper — small LLM call for tweaks)." The implementation just copies the payload verbatim. The reused resume's `summary`, `experience.bullets`, etc. still reference whatever the original JD/company highlighted. For consumer-facing roles where companies want a personalized intro line, this may produce visibly stale output — though the cost savings are real (zero LLM call vs ~$0.03 full tailor).

Trade-off:

- **Keep literal clone**: zero cost, fast, "good enough" for similar-target jobs where the resume content is interchangeable. Document as design intent.
- **Add LLM adapt step**: small (~$0.005) call to refine summary/closing for the new company/role; persists `adapted_from` lineage. More spec-faithful, more cost.

Recommendation: keep literal clone as default but add an `adapt: bool` query/body flag. Only enable in UI when the user wants it — otherwise free clones are a feature, not a bug.

**F3-F: similarity is keyword overlap, not embeddings (acceptable)**
`jd_similarity` does substring matching of `ScoringProfile` keywords. Fast, free, no embedding calls. Misses semantic similarity (e.g., "ICs report to me" vs "lead a team"). Acceptable for v1 — the keyword set comes from the target's tuned scoring profile, so it captures the user's actual signal. Voyage embeddings infrastructure exists (`embeddings/voyage_client.py`) if upgrading is ever needed.

**F3-G: reuse never surfaces to the user**
Backend writes `warnings: [..., "reused_from_similar_job"]` and `source_resume_id` on cloned rows. Neither field is surfaced in `ResumeEditor.tsx` or `JobDetailPanel.tsx`. The user has no way to tell whether a resume was generated fresh ($0.03) or reused ($0). The `cost_usd: 0` row IS shown in the editor's metadata block (`ResumeEditor.tsx:344-360`), but only when `cost_usd > 0` — so reused resumes get **no metadata block at all**. A small "Reused from {source job title}" badge would close the loop.

### Fixes applied

- **F3-E** ✅ (pivot) — Original triage proposed adding `adapt: bool`. On implementation we realised that flag would just duplicate `force_fresh: bool`'s semantics (both trigger full LLM regeneration). Pivot: wire a "Re-adapt with AI" button in `ResumeEditor.tsx` footer that POSTs `{job_description: record.jd_snapshot, job_posting_id, force_fresh: true}` to the new `/api/jobs/tailor/resume` proxy. Button only renders when the loaded resume is a clone (`warnings.includes('reused_from_similar_job')`) and not yet approved. A "small adapt LLM call" (cheap delta tweak vs full regen) is intentionally deferred — the spec language ("small LLM call for tweaks") needs a dedicated prompt path rather than a flag on the existing one. Filed as future work.
- **F3-F** 🔮 — deferred per triage; keyword Jaccard remains.
- **F3-G** ✅ — `ResumeEditor.tsx` renders the metadata block on every load (no `cost_usd > 0` gate, so $0 reuse cases now show "Cost: $0.0000"), plus a dedicated info-coloured banner with a "Reused" badge and remediation pointing at the new "Re-adapt with AI" button.

---

## #505 — Draft → edit → approve → export (.docx + zip)

### Status: 🟡 partial — flow is correct shape, edit versioning missing, blocked downstream by F3-A

### Code map

**Service / persistence**

- `app/services/tailor/persistence.py:75-103` — `persist()` writes initial draft row (no `approved_at`, no `updated_at`).
- `app/services/tailor/persistence.py:150-167` — `update_payload()` mutates `payload` JSONB in place, sets `updated_at = now()`. **No version history retained.**
- `app/services/tailor/persistence.py:170-176` — `approve()` sets `approved_at = now()`.
- `app/services/ats_lint/linter.py:1-202` — validates OOXML structure; called both pre-persist (in pipeline) and pre-update (in PATCH).

**Router**

- `app/routers/tailor.py:335-390` — `PATCH /tailor/resumes/{id}` — merges optional fields, re-renders, re-lints, re-uploads .docx. Rejects if already approved (409).
- `app/routers/tailor.py:393-417` — `POST /tailor/resumes/{id}/approve` — idempotent. **Advances `job_postings.status` to `resume_ready`** (line 412-415).
- `app/routers/tailor.py:288-332` — `POST /tailor/resumes/export-zip` — accepts `BulkExportRequest{resume_ids}`, 400 if any are unapproved, returns single .docx zip.
- `app/routers/tailor.py:434-453` — `GET /tailor/resumes/{id}/download` — single .docx.

**Schema**

- `supabase/migrations/20260425120001_resume_lifecycle.sql` — adds `updated_at`, `approved_at` columns + partial index on `approved_at`. Updates `job_postings.status` CHECK to include `resume_draft`/`resume_ready`/`interviewing`/`offer`.

**Frontend**

- `apps/root/src/app/fitted/(app)/jobs/JobDetailPanel.tsx:293-345` — gates `ResumeEditor` and `CoverLetterSection` on `status === 'resume_draft' || 'resume_ready'`.
- `apps/root/src/app/fitted/(app)/jobs/ResumeEditor.tsx:1-518` — modal editor with Summary (textarea), Skills (chips + add/remove), Experience (per-bullet edit + add/remove), Education (read-only). Save and Approve buttons. Approve advances `status='resume_ready'` via `onApproved` callback.
- `apps/root/src/app/fitted/(app)/jobs/JobsList.tsx:237-293` — `handleBatchExport` fetches `/api/jobs/tailor/by-job/{id}` for each selected job, filters by `approved_at`, sends `resume_ids` to export-zip endpoint.

**Tests**

- `apps/job-api/tests/test_tailor.py:` — 426 lines covering single-resume CRUD + lifecycle.
- `apps/job-api/tests/test_tailor_pipeline.py` — 313 lines for pipeline orchestration.

### Acceptance criteria

| AC                                    | Status | Evidence                                                                                                                                                                 |
| ------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Draft resume editable with free-text  | ✅     | `ResumeEditor.tsx:368-378` (summary textarea), 408-431 (skills), 458-477 (bullet inputs)                                                                                 |
| Edits saved and versioned             | ❌     | `persistence.update_payload()` mutates in place. `tailored_resumes` has `updated_at` but no `version` column or version-history table. **No rollback, no diff history.** |
| Approve action advances job status    | ✅     | `tailor.py:412-415` — `UPDATE job_postings SET status='resume_ready' WHERE id=row.job_posting_id`                                                                        |
| Individual .docx download             | ✅     | `tailor.py:434-453` + `ResumeEditor.tsx:175-193`                                                                                                                         |
| Bulk zip download                     | ✅     | `tailor.py:288-332` + `JobsList.tsx:237-293`                                                                                                                             |
| Expanded status lifecycle implemented | ✅     | `resume_lifecycle.sql:11-12` — full set including `interviewing`/`offer`                                                                                                 |
| ATS linter validates before export    | ✅     | Pipeline lints pre-persist; PATCH lints pre-update (`tailor.py:367-376`). Export does not re-lint (already validated upstream — fine).                                   |

### Findings

**F3-H: no version history on edits (AC ❌)**
`update_payload` overwrites the JSONB blob; nothing tracks prior versions. Spec says "Edits are saved and versioned." If the user makes a bad edit and saves it, prior content is gone. Two clean shapes:

- Add a `tailored_resume_versions` table (id, resume_id, version, payload, created_at).
- Or: append to a `version_history JSONB[]` array on `tailored_resumes` itself (simpler, no new joins).

Recommendation: array-on-row is cheaper and matches the JSONB-heavy persistence pattern already in use. Cap at last N (e.g. 10) versions to bound storage.

**F3-I: bulk export button doesn't reflect approved status (small UX nit)**
`BatchActionBar` receives `hasApproved={selectedIds.size > 0}` (`JobsList.tsx:422`) — so the "Export approved (.zip)" button shows whenever **anything** is selected. If none of the selected jobs have approved resumes, the user clicks export and gets a "No approved resumes" toast. Recoverable, but misleading — the button promises something the click can't deliver. Fix: lift `hasApproved` derivation to actually inspect resume state for selected jobs, or rename the button to "Export approved" and show a count of how many of the selection qualify.

**F3-J: PATCH lint failure UX (minor)**
When the user saves a draft and the re-rendered .docx fails ATS lint, `ResumeEditor.tsx:119-126` surfaces violations and bails. `setDirty(false)` is only called on success → state stays `dirty: true` so user can retry. This is correct, but the "Save Draft" button is disabled while `saving` is true and there's no error-recovery affordance besides "edit and try again." Acceptable for v1 — flag for follow-up if friction shows up in real use.

**F3-K: cover letter generation has the same broken contact path as F3-A**
`CoverLetterSection.tsx:69` sends `contact: {}` to `POST /api/jobs/tailor/cover-letter`. Backend `CoverLetterRequest.contact: ContactInfo` requires `name`. Same 422 every time. Whatever fix lands for F3-A should cover this endpoint too.

**F3-L: no single-resume generate UI (cross-cutting, low-priority)**
Cover letters have a per-job "Generate Cover Letter" button (`CoverLetterSection.tsx:153-162`). Resumes do not — the only way to advance a job to `resume_draft` is to multi-select (even with N=1) and hit the batch button. Not blocking, but asymmetric. Could surface a "Generate Resume" button in `JobDetailPanel` once the contact bug is resolved.

### Fixes applied

- **F3-H** ✅ — Decision: separate `tailored_resume_versions` table over array-on-row, capped at 5 most-recent snapshots with FIFO eviction. Migration `20260428120001_profile_identity_and_resume_versions.sql` creates the table with `(id, resume_id, payload JSONB, source, created_at)` + an index on `(resume_id, created_at DESC)`. `app/services/tailor/versions.py` exposes `record(supabase, resume_id, payload, source)` and `list_for_resume(...)`; the cap (`FREE_TIER_VERSION_CAP = 5`) is enforced in Python — easier to test/lift per user than a Postgres trigger. `persistence.insert_row()` records an `initial` snapshot; `persistence.update_payload()` records a `user_edit` snapshot **before** mutating the live row. New `GET /tailor/resumes/{id}/versions` returns `{versions: [...], cap: 5}`. Frontend `ResumeEditor.tsx` adds a collapsible "Version history" section with a free-tier cap warning ("Free tier keeps the last 5 versions. Older edits are dropped automatically.") and a per-row "Load" button that hydrates the editor state without saving. 3 backend tests in `test_tailor_versions.py`.
- **F3-I** ✅ — `hasApproved` was always `selectedIds.size > 0`. Lifted page-visible postings up via `JobsListTable.onPostingsLoaded` callback into `JobsList.tsx`'s `visiblePostings` state, then derived `hasApproved={visiblePostings.some(p => selectedIds.has(p.id) && p.status === 'resume_ready')}`. Export button now only shows when the selection has at least one `resume_ready` job.
- **F3-J** 🔮 — deferred per triage; PATCH lint UX unchanged.
- **F3-K** ✅ — folded into F3-A. `CoverLetterSection.tsx` no longer sends `contact`; backend resolves identically.
- **F3-L** 🔮 — deferred per triage; batch-of-1 works once F3-A is in.

---

## Rejected findings

These were initially flagged by code-map exploration but rejected on direct verification.

**~~Background processing missing for batches~~** — REJECTED. `tailor.py:507-521` correctly uses FastAPI `BackgroundTasks.add_task(process_batch, ...)`. Endpoint returns immediately with `batch_id`; frontend polls `GET /tailor/batch/{id}`. The polling-style architecture is appropriate for a single-user app.

**~~Approve doesn't advance job status~~** — REJECTED. `tailor.py:412-415` does the update inline after `persistence.approve()`. Verified.

**~~ATS linter not run before export~~** — REJECTED. Lint runs at two points: pre-persist (in `pipeline.py:123-130`) and pre-edit (in `tailor.py:367-376`). Re-linting at export would be wasteful since storage_path is only set after a clean lint.

---

## Triage queue

**Status legend**: ✅ fix · ⏭️ skip · 🔮 defer · 🟡 needs decision

| ID   | Finding                                                                        | Effort | Recommendation                                                                                                                                                                       |
| ---- | ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| F3-A | #503 batch endpoint 422s end-to-end — `contact: {}` vs required `name` (MAJOR) | M      | ✅ fix — add `contact_info JSONB` to `user_preferences` (or new `user_profile` table) + a small Profile UI to set it. Drop `contact` from request bodies; backend reads server-side. |
| F3-K | #505 cover letter has same broken contact path                                 | XS     | ✅ fix together with F3-A — single source of truth for contact.                                                                                                                      |
| F3-B | #503 batch progress is binary, not item-level (AC #5 🟡)                       | XS     | ✅ fix — surface `completed/total` in toast or progress bar in `BatchActionBar`.                                                                                                     |
| F3-H | #505 no edit version history (AC ❌)                                           | S      | 🟡 needs decision — array-on-row (cheap) vs separate versions table (cleaner)?                                                                                                       |
| F3-E | #504 reuse is literal clone, not LLM-adapted (spec says "small LLM call")      | S      | 🟡 needs decision — keep literal clone (free, fast) or add `adapt: bool` flag for opt-in LLM tweaks?                                                                                 |
| F3-G | #504 reuse never shown in UI                                                   | XS     | ✅ fix — show "Reused from {company}" badge in editor metadata block; render the metadata block even when `cost_usd === 0`.                                                          |
| F3-C | #503 cross-target batch silently uses first target for reuse                   | S      | 🔮 defer — corner case, document. Low risk while UI defaults to in-tab selection.                                                                                                    |
| F3-I | #505 "Export approved" button shown when nothing approved                      | XS     | ✅ fix — derive `hasApproved` from actual resume state for selected jobs, or rename the button to clarify.                                                                           |
| F3-L | #505 no single-resume generate button (asymmetric with cover letters)          | S      | 🔮 defer — once F3-A lands, batch-of-1 works fine. Add per-job button only if friction shows up.                                                                                     |
| F3-D | #503 `BATCH_MAX=20` duplicated in two places                                   | XS     | ⏭️ skip — cosmetic; both sides are clear. Revisit if the limit ever changes.                                                                                                         |
| F3-F | #504 similarity is keyword overlap, not embeddings                             | M      | 🔮 defer — acceptable for v1; document as future work.                                                                                                                               |
| F3-J | #505 PATCH lint failure UX is minimal                                          | XS     | 🔮 defer — flag if real users complain.                                                                                                                                              |

### Decisions taken

1. **F3-A shape (resolved)**: extend the existing `user_profiles` table (already used for SMS notifications) rather than adding a brand-new table. User reasoning: "we'll have a few users this week. I don't want to run migrations on the first weeks of use — I want to get this right so I can get good data on who's using it and what they're using." A dedicated identity table can come later if usage justifies it.
2. **F3-H shape (resolved)**: separate `tailored_resume_versions` table, capped at 5 most-recent. User reasoning: "if a user saves a new version, the 5th version gets bumped off, this should prevent endless versions. We should warn users about this — if this app becomes a thing, paying users can get endless versions." The cap is service-side Python so it's easy to lift per user/tier.
3. **F3-E shape (resolved + pivoted)**: locked `adapt=true` (opt-in). On implementation, realized the user-facing affordance can reuse `force_fresh: true` — adding a separate flag would duplicate semantics. Wired a "Re-adapt with AI" button instead. A real "small adapt" prompt path (cheap delta vs full regen) is future work.
4. **F3-B shape (resolved)**: live counter inline in `BatchActionBar` (chosen over auto-updating toast). Users keep their eyes on the bar while picking next jobs.

### Original open questions (kept for history)

1. **F3-A shape**: contact info storage. Options:
   - **A**: Extend `PreferencesPayload` with `contact: ContactInfo | None`. Drop `contact` from request bodies. Onboarding's `ResumeUploader` could backfill `name` from the parsed resume.
   - **B**: New `user_profiles` table. Cleaner separation, more surface area.
   - I lean **A** — single-user mode, preferences already have a getter pattern, no extra migration needed beyond a column add.
2. **F3-H shape**: version history. Array-on-row vs separate versions table?
   - Array is cheaper (no new join) but capped storage. Versions table is unbounded but adds a query path.
   - I lean array-on-row (cap last 10).
3. **F3-E shape**: literal clone vs LLM adapt. Should reuse be an opt-in feature (default literal, `adapt=true` upgrades to LLM)? Or default-adapt with `adapt=false` for literal?
4. **F3-B shape**: surface progress in `BatchActionBar` (live counter inside the bar) or via auto-updating toast (less invasive)?
