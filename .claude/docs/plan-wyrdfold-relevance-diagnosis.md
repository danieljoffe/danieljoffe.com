# Implementation Plan: Relevance Diagnosis & Tuning

**Author:** Claude (overnight session, 2026-06-02)
**Status:** Diagnostic playbook + measurable acceptance criteria. Most checks are read-only/cheap; one (FN sample) is ~$0.50.
**Prereq:** Phase 1 + Phase 2 backfills complete on all active targets (Melissa, Staff FE, FE Eng Mgr).

## Goal

Now that Phase 1 + Phase 2 are live and scoring real jobs, measure where the
pipeline is genuinely accurate and where it's mis-calibrated. Produce a short
findings doc + concrete prompt-tuning recommendations. Establish an offline
eval set so any future prompt change can be regression-tested before
deployment.

## Non-goals

- Reworking Phase 2's prompt (separate PR after findings).
- Adding new scoring axes (out of scope here; see streamlined-target plan).
- Building the feedback-driven prompt-evolution loop (plan item #7).

## What "good" looks like

| Metric                                          | Target                                    |
| ----------------------------------------------- | ----------------------------------------- |
| Phase 1 false-negative rate                     | < 5%                                      |
| Phase 2 score-clump density at any single value | < 8% of scored rows                       |
| Per-axis variance (each axis)                   | std-dev > 10 across promising rows        |
| Top-20 list spot-check approval                 | ≥ 17 / 20 obvious-yes-or-no calls correct |

If any of these miss target by >2x, that's a prompt-tuning trigger.

## Checks, ordered by ROI

### 1. Calibration spot-check on Melissa's list (~30 min, FREE)

The Director-of-CX-Ops target is the most off-discipline-prone (CX-ops vocabulary overlaps with PM, Sales Ops, RevOps, etc.). It's also the case Daniel surfaced as the original "scoring is wrong" trigger, so it's the highest-value sanity check.

Pull every Phase-2-graded row for `4195d651` sorted by score descending. For each of:

- the top 30
- the bottom 30
- 30 random middle rows

Categorize each as:

- **A** — score matches the role's actual fit (e.g., a real CX-ops director at 80)
- **B** — score is too high (e.g., a Sales Engineering AVP at 60)
- **C** — score is too low (e.g., a clear CX-ops role at 20)
- **D** — wrong dimension dominates (right title, wrong seniority, wrong domain)

Output: `relevance-findings.md` § "Calibration" — count per bucket per slice + worst-offender examples (job title + company + scored axes + reasoning text).

**Red flags to watch for:**

- Cluster of identical scores at round numbers (60, 70, 75) → LLM anchoring on its own scorecard buckets.
- High-scoring rows where `reasoning` is generic ("strong cultural fit") → prompt isn't extracting evidence properly.
- Low-scoring rows whose title clearly matches → Phase 2 is over-penalizing on one axis.

### 2. Per-axis distribution (~15 min, FREE)

For each of the three targets, pull all `complete` scores rows and compute:

- mean, median, std-dev of `axis_scores.title_fit`, `skills_fit`, `seniority_fit`, `domain_fit`
- Pearson correlation between each axis and the overall `score`
- Histogram of overall score (bin width 5)

What we're hunting:

- **Dead axis** — if an axis has std-dev < 5 across all rows, the LLM isn't using it. Either prompt it harder or drop it from the scorecard.
- **Decorrelated axis** — if an axis has |r| < 0.2 with overall score, it's noise.
- **Score saturation** — if overall scores cluster at 50/60/70/80 (each >12% of rows), the LLM's anchoring on its own scorecard examples. Loosen the prompt's example-score-list.

Output: `relevance-findings.md` § "Axis distribution" — three small tables (one per target).

### 3. The "Customer Success Manager at Bland AI = 56" mystery (~5 min, FREE)

This row stood out: it was scoring 56 before Phase 2 (keyword Stage 2 ceiling) AND after (claimed). Either:

- **a)** Phase 2 graded it 56 by coincidence (the LLM landed on the same number) — verify by reading `axis_scores` + `fit_reasoning`; if populated, Phase 2 ran.
- **b)** Phase 2 skipped it (daily cap exhausted before this row, or it wasn't promising) → row still carries the legacy keyword score. Verify `scoring_status` is `stage2` not `complete`.

If (b), this is a Phase 2 daily-cap or promising-gating regression worth investigating.

Output: one-paragraph diagnosis in findings doc.

### 4. Phase 1 false-negative sample (~$0.50, BOUNDED)

Phase 1's contract is "lean PROMISING on close calls" → its FN rate must be low for Phase 2 to even see good jobs. Sample 100 random `promising=false` rows across all three targets (33-34 per target), re-grade each with **Sonnet** (not Haiku) using the Phase 2 prompt's intent (would this be worth Phase-2 grading?). Count:

- **Confirmed unpromising** (Sonnet agrees) — good
- **Sonnet says actually promising** — Phase 1 FN

FN rate = `(sonnet-promising) / 100`. Target < 5%.

If > 5%: either (i) Phase 1's example pools are too aggressive on negative examples, or (ii) Haiku is dropping borderline cases that Sonnet would catch.

Output: `relevance-findings.md` § "Phase 1 FN audit" — rate per target, sample of mis-classified titles.

**Cost guardrail:** hard-cap the sample at 100 calls. Sonnet ~$0.005/call → $0.50 total worst case.

**Implementation note:** new script `apps/wyrdfold-api/scripts/audit_phase1_fn.py` — paginated, idempotent (skips already-audited rows tracked in `llm_costs.metadata.audit_run_id`), writes results to a JSONL file under `apps/wyrdfold-api/scripts/.audit-logs/`.

### 5. Phase 1 confidence capture (separate PR, ~half day)

Open question #4 from the migration plan was answered **yes** — capture confidence (0-100) alongside the bool verdict. Once shipped:

- Sort promising candidates for Phase 2 by confidence (replaces `first_seen_at`)
- Plot: Phase 1 confidence vs Phase 2 score correlation (should be positive; flat = Phase 1 noise)

This is the highest-leverage instrumentation we can add. **Scope this as a follow-up PR before the next prompt iteration.**

Implementation sketch:

- Extend `TitleVerdict` (relevance/title_triage.py) with `confidence: int | None = None`
- Update Phase 1 system prompt: "Also emit a 0-100 confidence score per verdict."
- Add `scores.phase1_confidence: int | null` column (migration).
- Backfill via `scripts/backfill_phase1_promising.py --confidence-only` flag (only updates the confidence column; doesn't re-grade).
- Update `phase2_runner.run_phase2_for_jobs` candidate sort to prefer `phase1_confidence DESC` then `first_seen_at DESC`.

### 6. Recency decay tuning (passive, observe for 1 week)

Now that `RECENCY_DECAY_ENABLED=true` is on, observe over ~7 days:

- Do jobs > 14 days old visibly drop in the list?
- Are good-fit-but-stale jobs disappearing too aggressively (decay too steep)?
- Are stale jobs lingering at the top because of high raw scores (decay too gentle)?

Tuning knobs in `recency.py`: `RECENCY_GRACE_DAYS=7`, `RECENCY_DAILY_DECAY=0.015`, `RECENCY_FLOOR=0.3`.

Default values are conservative; if anything, expect to bump decay to 2%/day after grace.

Output: a short note in findings doc — current observed behavior + recommended deltas.

## Deliverables

1. **`relevance-findings.md`** (new doc under `.claude/docs/`) — one-shot diagnostic snapshot at this point in time. Sections: Calibration (§1), Axis distribution (§2), Mystery cases (§3), Phase 1 FN audit (§4), Recency observation (§6 — to be filled in after 1 week).
2. **`apps/wyrdfold-api/scripts/audit_phase1_fn.py`** — bounded sampler, reusable for future audits.
3. **`apps/wyrdfold-api/scripts/diagnostic_axis_stats.py`** — read-only stats dumper, reusable.
4. **Follow-up PR scope:** Phase 1 confidence column + capture + Phase 2 candidate ordering (§5).

## Acceptance criteria

- All four "good" metrics measured and reported.
- At least 3 concrete prompt-tuning recommendations grounded in the data (not vibes).
- Re-runnable: the two scripts (audit + stats) can be re-executed after any prompt change to detect regression.

## Risks

- **Sonnet self-grading skew** (§4): using Sonnet to audit Haiku creates a circular dependency — Sonnet's blind spots become Phase 1's calibration ceiling. Acceptable for v1; a future audit might use Opus or a different provider for the audit pass.
- **Calibration spot-check is subjective** (§1): document the criteria explicitly so a re-audit is comparable.
- **Score distribution can shift between prompt iterations**: lock the snapshot timestamp in findings doc so future deltas are interpretable.

## What this plan does NOT cover

- The streamlined target creation (see plan-wyrdfold-streamlined-target.md) — informed by these findings but separately scoped.
- Logistics chip UI (see plan-wyrdfold-logistics-chips.md) — orthogonal.
- The feedback example pool (plan item #7) — separate workstream.
