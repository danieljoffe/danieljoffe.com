# Eval Results: Phase 2 Logistics-Addendum Shadow Run

**Date:** 2026-06-04
**Eval script:** `apps/wyrdfold-api/scripts/eval_logistics_shadow.py`
**Raw results:** `apps/wyrdfold-api/scripts/eval_results/eval_logistics_shadow_20260604T001946.json`
**Plan:** `.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md` — Eval 5
**Unblocks:** `settings.logistics_extraction_enabled` flag flip (PR #818)

## Recommendation

**SAFE TO FLIP** `logistics_extraction_enabled = True` in prod. All
Spearman ρ values clear the ≥0.9 threshold. The addendum is additive
to the prompt without measurably re-weighting the existing axis
scoring.

## Results

| Axis                    | Spearman ρ | Passes ≥0.9? |
| ----------------------- | ---------- | ------------ |
| title_fit               | 0.9749     | yes          |
| skills_fit              | 0.9778     | yes          |
| seniority_fit           | 0.9616     | yes          |
| domain_fit              | 0.9533     | yes          |
| **fit_score (overall)** | **0.9709** | **yes**      |

- Paired cases: **89/89** (no schema failures with or without the addendum).
- Model: `claude-sonnet-4.6` via OpenRouter.
- Cost: $1.01 (logistics off) + $1.24 (logistics on) = **$2.25 total**.

## Interpretation

- **domain_fit (0.9533) is the lowest** but still clears the threshold.
  This is the axis most likely to be affected by an additive prompt
  section that asks the model to extract location/anchor metadata —
  some redirection of attention to "primary office anchor" is exactly
  what the rho value would pick up. 0.95 says it's small.
- **skills_fit (0.9778) is the highest** — unsurprising; skills
  reasoning is the densest part of the prompt and the addendum doesn't
  touch it.
- **Overall fit_score ρ = 0.971** — practically a single distribution.
  Users would see no perceptible change in their job-fit scores after
  the flip.
- **Cost delta: +22% with logistics on** ($0.014 vs $0.011 per call).
  Driven by the +80-120 output tokens for the logistics JSON plus the
  larger max_tokens (1280 vs 1024). Plan-anticipated.
- **Zero schema failures across 178 calls.** The addendum doesn't push
  Sonnet over an output-tokens cliff at the 1280 cap.

## Methodology trade-offs

- Single model (Sonnet 4.6 — the prod choice). The addendum question
  is "does turning the flag on shift scores" — that's a within-model
  comparison, not a model-comparison.
- Independent runs (not double-sampling the same call), so some of
  the residual variance is just LLM nondeterminism, not addendum
  effect. The 0.971 overall ρ is an UPPER bound on the addendum's
  attention-redirection because nondeterminism shrinks ρ artificially.
- Reused the full 89-case fixture (no down-sampling). The fixture is
  already stratified by band (top/middle/bottom) so the ρ correctly
  weights across the score distribution.

## Action

- Flip `LOGISTICS_EXTRACTION_ENABLED` to True in prod settings.
- Monitor cost in the next 24h — expect ~22% bump on the
  `fit.job` purpose line in the OpenRouter/Anthropic usage dashboards.
- No rollback needed unless human review of the first ~50 logistics
  payloads shows hallucinated locations (separate from this score-
  shift check).
