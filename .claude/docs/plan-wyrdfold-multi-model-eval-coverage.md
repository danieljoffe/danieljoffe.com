# Implementation Plan: Multi-Model Eval Coverage for Remaining LLM Call Sites

**Author:** Claude (2026-06-03)
**Status:** Execution plan. Each section ships one eval script + one results doc; all run against the existing OpenRouter key.
**Prereq:** OpenRouter migration PR A merged (#822). Multi-model judge harness validated by the Phase 2 run (89 cases × 5 models, $4.19 spent).

## Goal

Extend the empirical model-comparison work beyond `relevance.job_fit` (Phase 2). Five additional LLM call sites need calibration data before we decide whether to swap them:

1. `relevance.title_triage` (Phase 1)
2. `tailor.cover_letter`
3. `targets.suggest` (onboarding) + `targets.suggest_lateral` (follow-up)
4. `targets.derive_profile_from_label`
5. Phase 2 with the logistics addendum on vs off (the committed shadow-run for PR #818's flag flip)

Each is a different prompt shape and needs a different grading approach. Same five-model panel as Phase 2 (sonnet-4.6, sonnet-4.5, gpt-5.1, gemini-2.5-pro, deepseek-v3.2), except where call-site economics make a different cut more appropriate.

## Why this is one plan, not five

Sub-plans would duplicate the harness scaffolding. Instead each section ships one focused script under `apps/wyrdfold-api/scripts/eval_*.py` that:

- Loads inputs from prod data or a small fixture set
- Calls each model via the existing `scripts/_openrouter.py` helper
- Persists raw JSON + a markdown summary under `scripts/eval_results/`
- Documents the recommendation in a one-page follow-up doc that links the raw results

Total budget: under $10 for the full battery.

## Eval 1 — Phase 1 title triage (PR C blocker)

**Call site:** `app/services/relevance/title_triage.py`. Haiku-backed binary classifier. Input = job title. Output = `{"promising": bool, "confidence": int}`.

**Question:** Can DeepSeek V3.2 (~10× cheaper than Haiku) match Haiku's agreement on the binary decision?

**Approach:**

- Pull ~200 recent `scores` rows: 100 with `promising=True`, 100 with `promising=False`. Stratified.
- Send each title through DeepSeek V3.2 via the existing triage prompt.
- Compute binary agreement vs Haiku (the prod baseline).
- Also compare to `claude-sonnet-4-6` as a quality ceiling.

**Acceptance threshold:**

- DeepSeek ≥95% agreement with Haiku on the 200-title set.
- False-positive rate (DeepSeek says promising, Haiku said not) under 7%. False-positives are tolerated more than false-negatives because Phase 2 catches the noise.

**Script:** `scripts/eval_phase1_triage.py`. Estimated cost: ~$0.05 (DeepSeek is dirt cheap; titles are short).

## Eval 2 — Cover letter (PR D enabler)

**Call site:** `app/services/tailor/tailor.py::tailor_cover_letter`. Sonnet-backed creative generation. Subjective output — no ranking baseline.

**Question:** Does GPT-5.1 (~3× cheaper, faster) produce cover letters that are at least as good as Sonnet?

**Approach:**

- Hand-pick 5 (user × JD) input pairs covering tech IC, ops leadership, creative/editorial, and data roles. Use Daniel's profile + 5 representative JDs from `jobs` table.
- For each pair, generate one letter with Sonnet 4.6, one with GPT-5.1, one with Haiku 4.5 (cheapest option to know what "too cheap" looks like).
- Anonymize and shuffle outputs.
- **Human spot-check (Daniel)**: blind-pick the better letter from each pair. Tie allowed. Acceptance: GPT-5.1 wins or ties ≥3/5.
- **LLM judge (held fixed, Opus 4.7)** as a corroborating signal: score each letter on persuasiveness, specificity, JD-alignment. Useful only if the human judgment is ambiguous.

**Acceptance threshold:** Human blind-pick GPT-5.1 ≥3/5 (wins or ties). If Daniel finds GPT-5.1 noticeably worse, stay on Sonnet.

**Script:** `scripts/eval_cover_letter.py`. Estimated cost: ~$0.50 generation + $1.50 judge = ~$2.

## Eval 3 — Target suggestion (PR G implementation)

**Call site:** `app/services/targets/suggest.py::suggest_targets` and `lateral_discovery.py::suggest_lateral_targets`. Both emit 5-8 role suggestions with reasoning. No ranking ground truth.

**Question:** Which model produces the most useful suggestions — i.e. roles the user could plausibly land that they haven't already targeted?

**Approach:**

- Fixture: 3-5 real user `OptimizedPayload`s from prod (Daniel, Melissa, +1-2 if available).
- Run `suggest_targets` (onboarding mode) and `suggest_lateral_targets` (lateral mode) on each profile through 5 models.
- **LLM judge (Opus 4.7, held fixed)**: score each suggestion on three axes:
  - **Coherence**: does the reasoning quote a specific user fact? 0-2.
  - **Relevance**: could this user land this role? 0-2.
  - **Diversity**: does the model cover multiple industries/altitudes? Counted once per (model, user) pair, 0-2.
- **Cross-model label-overlap matrix**: for each pair of models, count fraction of suggestions that match (case-insensitive label).
- **Human spot-check anchor**: Daniel reads 2 outputs per user, marks "useful / generic / wrong". Calibrates the judge scores.

**Acceptance threshold:** Recommend the cheapest model whose mean judge score is within 15% of Sonnet's, OR stay on Sonnet if no cheaper model qualifies.

**Script:** `scripts/eval_target_suggestion.py`. Estimated cost: ~$0.15 generation × 5 models × 2 modes × 4 users ≈ $6, + judge calls $1 = ~$7. **Highest cost of the five — most uncertain bench.**

## Eval 4 — Slim target derivation

**Call site:** `app/services/targets/derive_profile_from_label.py`. Sonnet-backed. Input = role label. Output = slim shape (description, seniority_hint, domain_hints, search_keywords, example titles).

**Question:** Does Sonnet 4.5 produce equivalently good slim shapes — schema-validity + qualitative description fidelity — at ~7% lower cost?

**Approach:**

- 10 canonical role labels covering the role spread used in Phase 2 eval ("Staff Frontend Engineer", "Director of CX Operations", "Senior Data Scientist", "Head of Content", "Plant Operations Manager", and 5 more).
- Run `derive_profile_from_label` for each label through Sonnet 4.6 (baseline) and Sonnet 4.5.
- Compare:
  - **Schema validity**: 100% required (Pydantic validation must pass).
  - **Token Jaccard overlap** on `domain_hints` and `search_keywords`.
  - **Description length / specificity**: both should land in the 80-600 char range with concrete domain anchors.
  - Human spot-check (Daniel): read 2 deriv pairs, pick the better one blind. Tie allowed.

**Acceptance threshold:** Sonnet 4.5 ≥80% Jaccard overlap on hints + keywords; human spot-check shows no quality preference. If yes, switch. If borderline, stay.

**Why this matters:** `derive_profile_from_label` is the on-ramp for every new target. A drift here propagates to all downstream Phase 2 grading.

**Script:** `scripts/eval_derive_target.py`. Estimated cost: ~$0.25.

## Eval 5 — Phase 2 with logistics addendum (PR #818 shadow-run)

**Call site:** `app/services/fit/job_fit.py::derive_job_fit` with `extract_logistics=True` vs `False`.

**Question:** Does adding the logistics JSON section to the Phase 2 prompt shift the axis scores?

**Approach:**

- Reuse the 89-case eval fixture.
- Run Sonnet 4.6 **twice** per case: once with `extract_logistics=False` (current behaviour), once with `True` (post-flag-flip behaviour).
- Compute Spearman ρ on each axis (title_fit, skills_fit, seniority_fit, domain_fit) between the two runs.
- Compute Spearman ρ on overall fit_score.

**Acceptance threshold:** ρ ≥ 0.9 on every axis AND overall score. If any axis drops below, the addendum is shifting attention away from scoring — re-prompt before flipping. Per `feedback-prompt-change-shadow-run`.

**Script:** `scripts/eval_logistics_shadow.py`. Estimated cost: 89 × 2 = 178 calls × $0.01 ≈ ~$2.

## Sequence + parallelism

These evals are **independent** — different scripts, different data, different models. Can fire concurrently with one OpenRouter key.

Execution order, given hourly compute is the bottleneck:

| #   | Eval                          | Wall-clock | Cost  | Blocks                   |
| --- | ----------------------------- | ---------- | ----- | ------------------------ |
| 1   | Phase 1 triage                | ~5 min     | $0.05 | PR C                     |
| 5   | Logistics shadow              | ~25 min    | $2.00 | PR #818 flip             |
| 4   | Slim target derivation        | ~5 min     | $0.25 | Sonnet-4.5 swap question |
| 2   | Cover letter (LLM-judge half) | ~10 min    | $2.00 | PR D                     |
| 3   | Target suggestion             | ~20 min    | $7.00 | PR G                     |

**Estimated total: ~$11.30, ~1 hour 5 min wall-clock if serialized.** With concurrent runs (separate Python processes against same OR account, OR rate-limits permitting), closer to 30 minutes.

The **cover letter human-spot-check** and **target-suggestion human-spot-check** require Daniel's eyeballs — they ship a "results doc with anonymized outputs, please pick" artifact rather than auto-deciding.

## Output artifacts

Each eval ships in this PR sequence (one PR per eval):

1. `scripts/eval_*.py` — runner script
2. `scripts/eval_results/<eval>_<timestamp>.json` — raw results (gitignored under `scripts/.audit-logs/` if PII concerns)
3. `.claude/docs/eval-results-<eval>-<date>.md` — committed write-up with recommendation, linked from the migration plan

The committed results docs are the load-bearing artifact — they're what justifies (or rejects) each subsequent model-swap PR.

## Acceptance criteria for this plan

The plan is satisfied when:

- All five eval scripts exist and run end-to-end against OpenRouter.
- Each has a committed results doc.
- Each has produced a yes/no recommendation on the relevant migration-plan PR (C, D, G, H).

## Out of scope (intentionally)

- `tailor.resume` benchmarking — creative output, hard to grade automatically, low call volume. Defer.
- `experience.derive` / `consolidate` — one-time per user, cost negligible.
- Multi-model ensemble (run N models in prod, take median) — speculative; not justified until we have one model swap landed.

## Connection to other plans

- **`plan-wyrdfold-openrouter-migration.md`** — this plan unblocks PRs C, D, G, H from that plan.
- **`plan-wyrdfold-logistics-chips.md`** — Eval 5 is the gating step for that plan's flag flip.
- **`plan-wyrdfold-lateral-discovery-v2.md`** — Eval 3's outcome informs whether the reconciled prompt (PR C of that plan) needs a different default model.
