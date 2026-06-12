# LLM Scoring Migration — Implementation Plan

**Author:** Claude (overnight session, 2026-06-02)
**Status:** Active. Foundation PRs landing through the night; user reviews in the morning.

## Context

Tonight we diagnosed that the current 4-signal scoring pipeline (Stage 1 title keyword + Stage 2 full-JD keyword + Stage 3 LLM blend + cosine prefilter) doesn't produce coherent relevance — see [decisions.md] entry for 2026-06-02. The pipeline grew organically and each stage can override the others. Voyage-3-lite cosine clusters all senior corporate roles 0.75-0.85 regardless of domain; keyword scoring rewards incidental tech matches; Stage 3 LLM boosts off-topic roles via lenient prompts.

Daniel's observation made it concrete: "Senior Product Designer" scoring 92 for a Staff Frontend Engineer target while actual frontend titles sit at 62.

## Target architecture

```
NEW JOB INGESTED (per active target)
  ↓
PHASE 1: Per-target LLM binary triage (Haiku 4.5, batched 250/call)
  Input: target.label + example_promising_titles + example_unpromising_titles + batch
  Output: {job_id: is_promising: bool}
  Persist: scores.promising + scores.excluded=NOT promising
  Cost: ~$0.40 per 8k-row backfill; ~$0.01 per poll cycle
  Bias: lean PROMISING on close calls — Phase 2 catches FPs; FNs are lost

PHASE 2: Per-target LLM fit grading (Sonnet 4.6, progressive batching)
  Runs ONLY on promising jobs, ordered by Phase 1 confidence (or first_seen_at)
  Batching: FIRST batch = 20 (first page renders fast),
            subsequent batches = 50 (catches up the rest)
  Daily cap per target: 100 automatic, rest on-demand
  Input: target + user_profile + (title, JD snippet)
  Output: {job_id: {score: 0-100, axes: {title_fit, skills_fit, seniority_fit, domain_fit}, reasoning}}
  Reuses derive_fit_score scaffold — same scorecard, same scale, same model
  Persist: scores.score, scores.score_breakdown (axis_scores), scores.fit_reasoning
  Cost: ~$2.25 per full backfill per target; ~$0.10 per poll cycle per target
  Fallback when LLM unavailable: leave scores.promising=true, scores.score=NULL — UI shows "Pending"

PHASE 2 RE-GRADING CONTRACT
  - Activate/deactivate flicker: do NOT re-grade jobs where
    scores.scored_profile_version >= target.profile_version. The
    existing bulk_score_for_target already does this check (#502 lazy
    re-scoring). Phase 2 inherits the contract.
  - Feedback-learner-triggered rescore: when the learner bumps
    profile_version, the rescore uses the same progressive batching
    (20 → 50). No single user action triggers an 8k-job LLM blast.
  - Newly-activated target with prior scores at version N, profile now
    at version N: nothing to do, scores already current. New scores
    get added for jobs that were ingested while the target was
    inactive (those have no scores row for this target yet).

POST-PHASE-2: Apply recency decay at read time
  final_score = phase2_score * max(0.3, 1.0 - max(0, age_days - 7) * 0.015)
  Fresh window: 7 days at full score
  Loses 1.5 points/day after grace
  Floors at 30% after ~50 days
  Computed in /jobs endpoint, NOT persisted — always reflects current date

PHASE 3 (USER-TRIGGERED DEEP DIVE): Opus 4.7 per request
  Same scorecard shape as Phase 2 + full JD analysis + match/gap explanation
  Expected variance from Phase 2: ±20 points
  Cost: ~$0.05/call
  Cap: 50/user/day soft limit
```

### Why this works

- **One scoring rubric end-to-end.** Phase 2 and Phase 3 emit the same `FitResult` shape on the same 0-100 scale. UI shows consistent axis breakdowns. Daniel's "±20 variance" expectation falls out naturally.
- **Per-target prompts, no global taxonomy.** Works for any profession the tool supports. Daniel's "Staff Frontend Engineer" target and Melissa's "Director of CX Operations" target both work without us defining role enums.
- **Cheap-then-expensive.** Phase 1 culls ~80% of noise at Haiku prices. Phase 2 only pays Sonnet costs on the survivors. Phase 3 only pays Opus on user-clicked items.
- **Examples evolve.** Auto-generated at target creation, then drift toward user-confirmed examples after ≥5 thumbs-up/down per side.
- **Recency baked in.** Stale postings naturally fall off without manual archiving — score multiplier does the work.

## Build order

### Foundation (overnight)

| #   | PR                        | Description                                                                                | Worktree      | Status |
| --- | ------------------------- | ------------------------------------------------------------------------------------------ | ------------- | ------ |
| 1   | foundation-fit-module     | Refactor `derive_fit_score` into `app/services/fit/` with shared scaffold                  | fit-module    | TODO   |
| 2   | fix/skip-inactive-targets | Skip scoring for inactive targets across all paths                                         | skip-inactive | TODO   |
| 3   | feat/target-example-pools | Auto-generate `example_promising_titles` + `example_unpromising_titles` at target creation | example-pools | TODO   |

### Core redesign (next sessions)

| #   | PR                         | Description                                                              | Notes                                                                        |
| --- | -------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 4   | feat/phase1-title-triage   | Replace cosine prefilter with LLM binary classifier                      | Adds `scores.promising` column; cosine columns kept (unused) for one release |
| 5   | feat/recency-decay         | Final score multiplier at read time                                      | Tiny PR, big UX win                                                          |
| 6   | feat/phase2-job-fit        | Replace keyword pipeline with `derive_job_fit`                           | Biggest piece; ships with backfill script                                    |
| 7   | feat/feedback-example-pool | 👍/👎 wired to per-target example pools, swap in once ≥5 labels per side | Requires UI affordance + persistence                                         |
| 8   | feat/phase3-deep-dive      | Refit user-triggered deep dive onto new schema                           | Stronger model + full JD context                                             |

### UX wins (parallel, can ship anytime)

| #   | PR                                       | Description                              |
| --- | ---------------------------------------- | ---------------------------------------- |
| U1  | ux/default-all-jobs-tab + enter-debounce | Two small wins in one PR                 |
| U2  | ux/persist-filters-localstorage          | Per-(user, target) filter state          |
| U3  | feat/active-target-limit                 | 5-active cap                             |
| U4  | ux/target-tab-pills                      | `[fit_score] [name] [⚙ gear]` tab format |

### Migration risks

- **Score column repurposed.** Existing keyword-derived scores aren't comparable to new LLM-derived scores. One-time re-grade required on Phase 2 ship. Cost: ~$5-10 across the system.
- **Cosine columns stay in DB.** Drop in a cleanup PR one release after Phase 1 ships, after we've confirmed nothing reads them.
- **Backfill needed at Phase 2 ship.** Reuse the `scripts/backfill_relevance_prefilter.py` pattern — paginated, idempotent, `--dry-run` flag.

### Cost ceilings (per active target, per month)

| Phase   | Tokens per job    | Model      | $ per job | Jobs/month estimate                                                               | Monthly $ |
| ------- | ----------------- | ---------- | --------- | --------------------------------------------------------------------------------- | --------- |
| Phase 1 | ~50 in, ~10 out   | Haiku 4.5  | $0.0001   | 100k (12 polls/day × ~8k titles seen across all sources / divided across targets) | $1-3      |
| Phase 2 | ~500 in, ~100 out | Sonnet 4.6 | $0.0035   | 15k (only promising × 100/day cap)                                                | $5-15     |
| Phase 3 | ~2k in, ~500 out  | Opus 4.7   | $0.05     | 200 (user-triggered, 50/day cap × 4 users)                                        | $10       |

Total per active user per month: ~$15-30. Per 5-target user: ~$80-150/month worst case. Sustainable for now.

## Activate/deactivate flicker protection

Beyond the progressive batching above, a user can toggle a target on and off freely (intentional or not). The contract:

- **Off → On (no metadata change since last on):** zero LLM work. Existing scores at `scored_profile_version == target.profile_version` stay valid.
- **Off → On (target's `profile_version` bumped while off):** rescore stale rows progressively (20, then 50 chunks).
- **Off → On (new jobs ingested while off):** Phase 1 grades the new arrivals only. Existing scored rows untouched.
- **On → Off:** trigger flips `targets.is_active` via the user_targets OR. Foundation PR #784 already short-circuits all per-target scoring entry points. Zero work.

This keeps a careless flicker session at $0.00 in LLM cost.

## Limits roadmap (parallel runaway-protection)

Beyond the 5-active-target cap, these guards need to land alongside the redesign or shortly after:

1. **Skip inactive targets in all scoring code paths** ← Foundation PR #2
2. **Phase 2 daily cap per target**: top 100 promising jobs/day automatic; rest on-demand. Prevents a bursty source from blowing the budget.
3. **Phase 3 daily cap per user**: 50/day soft. Surfaced as "you've hit the deep-dive limit for today — try again tomorrow" if exceeded.
4. **Reference JDs per target**: 5 max. Each one re-derives the profile, expensive.
5. **Resume tailor/regenerate per user per day**: 30/day soft.
6. **Manual job submission per user per hour**: 20/hour.
7. **Saved/applied jobs per user**: 500 hard cap.
8. **Document storage**: 20 docs/user, 2MB each.
9. **Magic-link request rate**: 3/email/15min. (Verify existing.)

I'll add an ADR for the limits framework once 2-3 of these ship as a pattern.

## Open questions for Daniel's review

1. **Phase 2 deferred grading UX.** ✅ **Resolved 2026-06-03:** "Pending score" badge, sorted to the bottom of the list. Surfaces breadth without losing the un-graded jobs.

2. **Cosine deprecation timing.** ✅ **Resolved 2026-06-02:** Columns dropped in PR #794 (`chore/wyrdfold-drop-cosine-columns`) after Phase 1 shipped.

3. **Per-target Phase 2 spend visibility.** ✅ **Resolved 2026-06-03:** Surface "$X spent grading jobs for this target this month" in target settings. Sources from `llm_costs` with `purpose='fit.job'` and `metadata.target_id` (same query shape as `phase2_quota_remaining`).

4. **Phase 1 confidence signal.** ✅ **Resolved 2026-06-03:** Capture confidence (0-100) alongside the bool. Extend `TitleVerdict` with an optional `confidence: int` field and log it (no behaviour change — Phase 1 still gates on bool). Useful both for analytics ("Phase 1 was 53% sure on this one, Phase 2 graded it 81") and for ordering Phase 2 candidates by confidence instead of first_seen_at.

## Rollback plan

Each PR is independently reversible:

- **Foundation #1 (refactor)**: zero behavior change — revert PR if anything regresses.
- **Foundation #2 (skip inactive)**: if it breaks anything, set the guard to no-op via env var (e.g., `SKIP_INACTIVE_TARGETS=false`).
- **Foundation #3 (example pools)**: columns are nullable — if generation fails, target works as before.
- **Phase 1**: feature flag (`PHASE1_TRIAGE_ENABLED`) defaults off until we verify Daniel's targets behave; flip on after one good poll cycle.
- **Phase 2**: same flag pattern. Falls back to keyword scorer if flag off.
- **Recency decay**: single multiplier, can be flagged to 1.0 (no-op).

## What I'm doing tonight

In order, until I run out of time or hit something ambiguous:

1. Foundation #1 → PR
2. Foundation #2 → PR
3. Foundation #3 → PR (if API stable enough)
4. UX U1 (default tab + enter short-circuit) → PR
5. UX U2 (filter localStorage) → PR
6. UX U3 (active-target limit) → PR

If I hit something I can't decide without you, I'll stop and document the decision point in this plan rather than guess.

## Decisions log

### 2026-06-03 — Overnight delivery

Five PRs opened, all small and independently revertable. None merged — left for Daniel's morning review.

| PR   | Branch                                       | Purpose                                                                                |
| ---- | -------------------------------------------- | -------------------------------------------------------------------------------------- |
| #784 | feat/wyrdfold-skip-inactive-targets          | Skip scoring + polling for inactive targets (foundation guard for LLM cost protection) |
| #785 | feat/wyrdfold-default-all-tab-enter-debounce | Default Jobs page tab = All Jobs; Enter short-circuits search debounce                 |
| #786 | feat/wyrdfold-persist-filters-localstorage   | Per-target filter persistence (localStorage)                                           |
| #787 | feat/wyrdfold-active-target-limit            | 5-active-target cap with 409 ACTIVE_LIMIT response                                     |
| #788 | feat/wyrdfold-target-example-pools           | Auto-generate example_promising_titles + example_unpromising_titles at target creation |

Test count: 988 → 993 (api) + new Jest hook tests (frontend).

### 2026-06-03 — Reference JD merge of example pools

Adding a new reference JD to a target updates the example pools to reflect the LATEST JD only — not merged across all JDs. Concrete title examples don't aggregate the way weighted keywords do; merging would dilute the few-shot signal. Acceptable behavior: pools shift toward the most recent JD's worldview, but stay coherent for whichever JD was last added. If this becomes a problem (e.g., a user wants pools to span multiple JDs), the fix is a separate "pool aggregation" pass — out of scope for now.

### 2026-06-03 — Recency decay deferred

Started building, hit a design fork that needs Daniel's call:

- **Display-only decay** (apply multiplier in Python after fetch) breaks the list sort order: a 30-day-old job at raw 90 decays to 59 but the DB still sorts it above a 1-day-old job at raw 85. User sees top of list with lower visible scores than rows below.
- **Sort-respecting decay** requires either (a) recomputing+storing a `recency_decayed_score` column nightly via cron, (b) a Postgres expression/view that computes decay at query time (forces a full table scan unless indexed), or (c) loading all matching rows into Python and sorting after decay (kills pagination).

Defer to a proper design session — none of these are right to commit to autonomously overnight. The math helper (`compute_recency_multiplier`) is uncontroversial; the storage/sort architecture is the question.

### 2026-06-03 — Fit-module refactor folded into Phase 2

Originally planned as a setup PR (move `derive_fit_score` to `app/services/fit/`). On reflection, no value to ship in isolation — Phase 2 will create the shared `app/services/fit/` package itself when adding `derive_job_fit`, and at that point both functions get the unified schema. Skipping the standalone refactor.
