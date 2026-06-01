# Research: Wyrdfold Dynamic Relevance Feedback Loop

Status: design proposal, not implemented. Grounded in the codebase as of 2026-05-31.

## 1. Current world (so we know what we're plugging into)

- Targets live in `job_targets` (`supabase/migrations/20260424120001_create_job_targets.sql`) with `scoring_profile JSONB` and (later) `search_keywords TEXT[]`, `profile_version INT`, `activation_status`, etc.
- Per-target job scores live in `job_target_scores` (`supabase/migrations/20260424120005_create_job_target_scores.sql`): `(job_posting_id, target_id, score, score_breakdown, matched_keywords, excluded)` with a unique `(job_posting_id, target_id)`.
- `ScoringProfile` shape — see `apps/wyrdfold-api/app/models/targets.py`:
  ```
  ScoringProfile {
    categories: { [name]: { keywords: {kw: 1..3}, weight: float } },  // core_skills, secondary_skills, nice_to_have
    seniority: { level, signals[] },
    domain:    { signals[], weight },
    negative:  { keywords[], weight: -10 }
  }
  ```
- `search_keywords: list[str]` lives alongside the profile and drives ATS queries (Greenhouse `q=`, etc.) — distinct from the scoring keywords.
- Scoring entry point: `apps/wyrdfold-api/app/services/target_scoring.py` — `score_title_and_upsert` (Stage 1, title-only) and async Stage 2 (full JD). Re-score endpoint is already a noted consumer.
- LLM: Anthropic SDK via `app/services/llm/client.py` (`LLMClient`, `complete_json`); existing derivation pipelines (`derive_profile_from_label.py`, `derive_profile.py`, `merge.py`) already produce the JSON shape above and log to `cost_log`.
- UI surfaces: `apps/wyrdfold/src/app/(app)/jobs/JobCard.tsx` (list row with `Dropdown` of actions: Open, View original, Delete) and `apps/wyrdfold/src/app/(app)/jobs/[id]/JobDetailPage.tsx` + `JobDetailPanel.tsx` (status changes, analyze, delete).

## 2. UX design

### Jobs list (`JobCard.tsx`)

Add two dropdown items above Delete:

- `Mark irrelevant` (thumbs-down icon) — closes the row's `Dropdown`, shows an inline 1-line textarea ("Why? (optional, e.g. 'sales role')") with `Skip` / `Submit`. Submit fires `POST /api/jobs/{id}/feedback`. The row gets a muted state + an Undo affordance (toast with 5s timer).
- `Mark highly relevant` (thumbs-up) — same pattern, optional reason.

For batch mode, extend `BatchActionBar.tsx` with `Mark all irrelevant` (with reason prompt that applies to all selected). This is the highest-leverage entry point for cleaning up a noisy poll.

### Job detail (`JobDetailPanel.tsx`)

Add a `Feedback` sub-section under the score breakdown:

- Two buttons: `Not for me` / `Great match`.
- After click, expand a textarea for reason; submit on blur or Enter.
- Show the user's prior feedback if any ("You marked this irrelevant 3d ago — reason: …") with an Undo.
- No hard confirm modal — Undo via toast (existing `useToast`) is cheaper and matches the existing Delete flow.

Reason is **always optional**. Don't gate the signal on reasoning.

## 3. Data model

New table:

```sql
CREATE TABLE job_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL,
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  target_id    UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  signal       TEXT NOT NULL CHECK (signal IN ('irrelevant','relevant')),
  reason       TEXT,
  applied_at   TIMESTAMPTZ,        -- when the learner consumed it
  applied_run_id UUID,             -- groups feedback that produced one mutation
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, job_posting_id, target_id)  -- latest wins on conflict
);
CREATE INDEX idx_job_feedback_target_unapplied
  ON job_feedback(target_id) WHERE applied_at IS NULL;
```

Notes:

- `target_id` is mandatory because feedback is _about a target's lens_, not about jobs in the abstract. A job marked irrelevant for "Senior FE" can still be relevant for "Eng Manager".
- Store learner-inferred keywords inside the existing `scoring_profile` JSONB rather than new columns. Two reasons: it keeps the merge/derive code (`apps/wyrdfold-api/app/services/targets/merge.py`) as the single source of truth, and `profile_version` already bumps on changes (used by `score_title_and_upsert`'s `scored_profile_version`).
  - Negative keywords append into `scoring_profile.negative.keywords` (with provenance tracked in a sibling `learned_meta` block: `{kw: {source: 'feedback', n: 3, last: ts}}` — see guardrails).
  - Positive keywords append into `scoring_profile.categories.secondary_skills.keywords` with weight 1, unless they already exist in `core_skills`.
- Optionally add `target_learning_log` (`target_id, run_id, prev_profile, next_profile, diff, signals_consumed`) for rollback/audit.

## 4. LLM inference pipeline

Triggers (cheap path first):

1. **Synchronous shallow update** on every feedback submit: a deterministic Python step (no LLM) appends/removes any _literal_ keywords the user typed in `reason` that already exist in the profile. Zero cost, instant feedback signal.
2. **Batched LLM inference** runs when _either_ threshold trips per `(user_id, target_id)`:
   - N >= 3 unapplied irrelevant signals, OR
   - any unapplied signal older than 24h, OR
   - explicit manual trigger from settings.
     This runs as a `BackgroundTasks` job from the feedback endpoint (same pattern as `_activate_pipeline` in `routers/targets.py`) or as a separate worker invoked by `POST /targets/{id}/learn`.

Prompt input:

- Current `scoring_profile` JSON.
- The N feedback rows: `{job title, company, signal, reason}` (titles only — keep tokens cheap; pull JD text only if reason is empty AND signals >= 5).
- System prompt mirrors `derive_profile_from_label.SYSTEM_PROMPT` and returns a `ProfilePatch`:
  ```
  { add_negative: [str], remove_negative: [str],
    add_secondary: {kw: int}, demote_keywords: [str],
    confidence: 0..1, rationale: str }
  ```
- Use `complete_json` against a Pydantic `ProfilePatch` model, log via `cost_log` with `purpose='target.learn_from_feedback'`.

Application:

- Merge the patch into `scoring_profile` using a new `apply_patch` in `app/services/targets/merge.py` (keeps merge logic centralized).
- Bump `profile_version`. Stamp every consumed `job_feedback.applied_at` + shared `applied_run_id`.
- If `confidence < 0.6`, **stage** the patch in `target_learning_log` without applying; show it on a settings page for the user to approve.

## 5. Re-scoring trigger

Profile changes already invalidate stage-2 scores via `scored_profile_version`. On apply:

1. Re-run **Stage 1** for every job in the target (the cheap title-only path — `_retro_score_existing_jobs` in `routers/targets.py` already does this in batches of 500). No LLM cost.
2. Mark `job_target_scores.scoring_status = 'stage1'` for affected rows so the existing async Stage 2 worker re-picks them on demand (lazy — only re-do Stage 2 for jobs the user actually opens, or for the top K by Stage 1 score).
3. **Do not re-poll adapters.** Polling is keyword-driven; only re-poll if `search_keywords` changed, and only on the next scheduled tick. Adding entries to `search_keywords` is a learner action only when positive feedback repeatedly surfaces a title pattern that isn't already in the list — guardrail behind manual approval for v1.

Cost: 1 patch LLM call per batch (sonnet-4-6, ~2-4k tokens in, ~500 out → cents). Stage 1 re-score is pure Python.

## 6. API surface

All routes in `apps/wyrdfold-api/app/routers/`. Auth via existing `verify_api_key_or_jwt`.

- `POST /jobs/{job_id}/feedback` → body `{signal: 'irrelevant'|'relevant', reason?: str, target_id: uuid}` → 201 `{feedback_id, queued_learn_run: bool}`. Upserts on the unique key. Triggers the batched learner via `BackgroundTasks` if the threshold trips.
- `DELETE /jobs/{job_id}/feedback?target_id=...` → 204. Undo.
- `GET /targets/{target_id}/feedback?limit=&cursor=` → list for the settings UI.
- `POST /targets/{target_id}/learn` → force-run the learner now; returns the staged or applied patch + diff.
- `POST /targets/{target_id}/learn/{run_id}/apply` and `.../reject` → for staged patches (low confidence path).
- Frontend route handlers in `apps/wyrdfold/src/app/api/jobs/[id]/feedback/route.ts` proxy to wyrdfold-api (matches existing pattern under `apps/wyrdfold/src/app/api/`).

## 7. Phasing

**v1 (1-2 days, no LLM)**

- `job_feedback` table + endpoints + UI affordances on list and detail.
- Deterministic-only learner: literal-keyword extraction from `reason`, append to `scoring_profile.negative.keywords` when N>=3 marks share a token.
- Manual `Re-score now` button on the target settings page.
- Ship just this — it already moves the needle for noisy targets.

**v2 (~3 days, batched LLM)**

- Add `ProfilePatch` LLM step behind threshold + cron.
- `target_learning_log` for audit/rollback.
- Auto Stage-1 re-score on apply.

**v3 (poller adapts)**

- Learner can propose changes to `search_keywords` (additions for positive patterns, removals if a search term turns out to surface mostly noise).
- Approval-gated by default; auto-apply only above a confidence threshold and after M weeks of stable feedback.
- Optional per-adapter filters (e.g., Greenhouse `--exclude-titles`) sourced from `scoring_profile.negative.keywords`.

## 8. Risks & guardrails

- **Overfitting to one bad signal.** Require N>=3 feedback items before any non-literal mutation; weight by `confidence` from the LLM; never let one click rewrite a category.
- **Drift away from the user's actual goal.** Show a diff (`prev_profile` → `next_profile`) in the toast/settings whenever a patch is applied. Keep `target_learning_log` for one-click rollback.
- **Adversarial echo chamber.** Cap learned-negative keywords at ~20 per target; LRU-evict on next learn run. Mark every learned keyword with `learned_meta` provenance so we can distinguish from user-derived ones.
- **Cross-user contamination.** Targets are shared (see `apps/wyrdfold-api/app/services/targets/merge.py` corpus-building). Feedback must be per `(user_id, target_id)` and must not mutate the shared profile when the target has >1 active user — instead, fork into a per-user override layer applied at score read time. For v1, restrict learning to single-user targets and gate multi-user with a TODO.
- **Score thrash for the user.** `profile_version` bump invalidates Stage 2 but we keep Stage 1 results visible; the UI should toast "Your list updated based on 3 marks" so it's not silent.
- **Cost runaway.** Reuse `enforce_llm_budget` dependency from `routers/targets.py` on `/learn` endpoints. Cap learn runs to once/hour per target.

## 9. Open questions

- Should "Mark irrelevant" also auto-hide the row, or just deprioritize? Suggest deprioritize for v1 — hiding feels destructive and we already have Delete.
- Surface positive feedback in `core_skills` (weight 2-3) or `secondary_skills` (weight 1-2)? Default secondary; promote to core only on repeat positive signal for the same keyword across 3+ jobs.
- Where does the learner live operationally — inline `BackgroundTasks` (matches `_activate_pipeline`) or a Supabase cron + worker? Inline is simpler for v1; revisit if learn-run latency gets noticed.

## Key files referenced

- `apps/wyrdfold-api/app/services/target_scoring.py`
- `apps/wyrdfold-api/app/services/targets/{merge,derive_profile,derive_profile_from_label,crud}.py`
- `apps/wyrdfold-api/app/routers/targets.py` (`_activate_pipeline`, `_retro_score_existing_jobs`)
- `apps/wyrdfold-api/app/models/targets.py` (`ScoringProfile`, `JobTarget`)
- `apps/wyrdfold-api/app/services/llm/client.py` (`complete_json`, `cost_log`)
- `supabase/migrations/20260424120001_create_job_targets.sql`
- `supabase/migrations/20260424120005_create_job_target_scores.sql`
- `supabase/migrations/20260426120005_add_llm_score_columns.sql`
- `apps/wyrdfold/src/app/(app)/jobs/JobCard.tsx`, `BatchActionBar.tsx`
- `apps/wyrdfold/src/app/(app)/jobs/[id]/JobDetailPage.tsx`, `JobDetailPanel.tsx`
