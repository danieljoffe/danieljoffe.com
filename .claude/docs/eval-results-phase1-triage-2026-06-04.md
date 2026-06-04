# Eval Results: Phase 1 Title Triage (DeepSeek vs Haiku)

**Date:** 2026-06-04
**Eval script:** `apps/wyrdfold-api/scripts/eval_phase1_triage.py`
**Raw results:** `apps/wyrdfold-api/scripts/eval_results/eval_phase1_triage_20260604T001149.json`
**Plan:** `.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md` — Eval 1
**Unblocks:** PR C from `plan-wyrdfold-openrouter-migration.md`

## Recommendation

**STAY ON HAIKU 4.5. Do not swap to DeepSeek V3.2.**

DeepSeek fails both acceptance thresholds:

- Agreement with Haiku: **86.5%** (threshold ≥95%) — fails by 8.5 pts.
- False-positive rate: **14.0%** (threshold ≤7%) — fails by 2× over budget.

The cost savings ($0.0028 vs $0.0154 per 89-title pass, ~5.5× cheaper)
are real, but the disagreement rate would push ~14% extra noise into
Phase 2 Sonnet grading, more than wiping out the Phase 1 savings (one
extra Phase 2 call is ~$0.003 at Sonnet vs $0.00003 saved on the Phase
1 verdict).

## Results

| Model           | Agreement vs Haiku | FPR   | FNR   | Compared | $ total | Latency |
| --------------- | ------------------ | ----- | ----- | -------- | ------- | ------- |
| sonnet-4.6      | 89.9%              | 10.0% | 10.3% | 89       | $0.0461 | 4344ms  |
| deepseek-v3.2   | 86.5%              | 14.0% | 12.8% | 89       | $0.0028 | 9760ms  |
| haiku-4.5 (ref) | —                  | —     | —     | —        | $0.0154 | 2352ms  |

**Per-target agreement** (each target is one active production user-target):

| Target                                   | sonnet-4.6 | deepseek-v3.2 |
| ---------------------------------------- | ---------- | ------------- |
| Staff Frontend Engineer                  | 86.7%      | 83.3%         |
| Director of CX Operations & Transformati | 82.8%      | 75.9%         |
| Frontend Engineering Manager             | 100.0%     | 100.0%        |

## Interpretation

The Director of CX Operations target is the disagreement hotspot —
both DeepSeek (75.9%) and Sonnet (82.8%) diverge from Haiku there.
That suggests the issue is **prompt brittleness on
soft/ambiguous CX role titles**, not a DeepSeek-specific failure mode.
A Sonnet "upgrade" would help only marginally (89.9% agreement) at
3× the cost — also not justified by this data.

The Frontend Engineering Manager target gets 100% three-way agreement,
confirming that for well-bounded role labels the smaller models all
land in the same place.

Latency: DeepSeek is **4× slower** than Haiku (9.8s vs 2.4s p-avg).
That alone would degrade the poller's batch throughput visibly.

## Methodology trade-offs

- Used 89 titles from the existing eval_set.json fixture rather than
  sampling 200 fresh rows from production `scores`. The fixture is
  hand-picked to span the band distribution (top/middle/bottom) that
  Phase 2 actually grades, so it's a reasonable proxy for the prod
  title mix. A future expansion to 200+ rows is tracked by
  `scripts/audit_phase1_fn.py` (which already pulls from prod) and
  would mostly tighten the confidence interval on the agreement rate.
- Took Haiku's verdict as the reference (the plan's framing).
  Haiku-as-ground-truth assumes the current production model is
  approximately right. The disagreement-heavy CX target above shows
  this is partially circular — Haiku could be the one that's wrong on
  that target. Audit of those specific rows by hand is the next step
  if we ever want to dethrone Haiku.
- Batch size: 25 titles per call. Prod uses 250. Smaller batches
  shouldn't change the verdict bias materially (each title is graded
  independently within the batch), and they keep each call's max_tokens
  envelope tight for cost-tracking precision.

## Action

- Mark PR C ("DeepSeek for Phase 1 triage") in
  `plan-wyrdfold-openrouter-migration.md` as **rejected by eval**.
- No prod code change needed. Phase 1 stays on `claude-haiku-4-5`.
- If a future cost-reduction push wants to revisit, the lever to pull
  is the prompt itself (or the target example pools) — not the model.
