# Eval Results: Slim Target Derivation (Sonnet 4.6 vs 4.5)

**Date:** 2026-06-04
**Eval script:** `apps/wyrdfold-api/scripts/eval_derive_target.py`
**Raw results:** `apps/wyrdfold-api/scripts/eval_results/eval_derive_target_20260604T001511.json`
**Plan:** `.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md` — Eval 4
**Unblocks:** the Sonnet 4.5 swap question for `derive_profile_from_label`

## Recommendation

**STAY ON SONNET 4.6** for `derive_profile_from_label`. Sonnet 4.5 fails
the plan's ≥80% Jaccard threshold on hints (0.40) and clears the
keyword threshold only marginally (0.55). The cost saving doesn't
justify the drift.

Secondary finding (separate from the model question): **both** Sonnet
versions occasionally emit `description` strings longer than the 800-
char Pydantic ceiling. This is a prompt-vs-schema mismatch — the prompt
asks for 80-600 chars, the schema caps at 800, and the LLM lands at
800-900 chars on dense role labels (engineering management, design
leadership). This is a known prompt-rule-adherence weakness, not a
model-swap blocker, but it would benefit from either tightening the
prompt ("hard cap 600 chars, count and trim before emitting") or
raising the schema ceiling. Tracked separately — not in scope for this
eval.

## Results

| Model      | Schema OK | Mean hint Jaccard | Mean keyword Jaccard | $ total | Avg latency |
| ---------- | --------- | ----------------- | -------------------- | ------- | ----------- |
| sonnet-4.6 | 7/10      | (baseline)        | (baseline)           | $0.2529 | 19.4s       |
| sonnet-4.5 | 5/10      | 0.4048            | 0.5485               | $0.2362 | 15.1s       |

Cost delta: $0.017 across 10 calls (~6.6% cheaper for Sonnet 4.5).

### Per-label Jaccard (Sonnet 4.5 vs 4.6, only cases where both validated)

| Label                     | Hint Jaccard | Keyword Jaccard | Seniority match |
| ------------------------- | ------------ | --------------- | --------------- |
| Staff Frontend Engineer   | 0.21         | 0.53            | yes             |
| Director of CX Operations | 0.53         | 0.77            | yes             |
| Head of Content           | 0.47         | 0.35            | yes             |

The 0.21 hint Jaccard on Staff Frontend Engineer is the worst data
point — the two Sonnets pick fundamentally different domain anchors
for the same label. The plan's ≥80% threshold isn't met on any of
the comparable rows.

## Interpretation

- **Seniority matching is perfect** (3/3 comparable rows). Sonnet 4.5
  reliably picks the same SeniorityHint enum value as 4.6.
- **Hint divergence is the dominant signal.** Even on a clean tech
  label (Staff Frontend Engineer) the two models pick different
  industries to anchor on. Since `domain_hints` feeds Phase 2's
  `domain_fit` axis directly, this drift would meaningfully change
  downstream scoring.
- **Description-length overruns are model-agnostic.** Sonnet 4.6
  failed schema validation on 3/10 labels; Sonnet 4.5 on 5/10. The
  overruns are by 50-150 chars and the underlying text is fine — this
  is a hard schema cap, not a quality issue. Worth a separate prompt
  tightening regardless of which model we pick.
- **Latency:** Sonnet 4.5 averaged 15s vs 4.6's 19s (~20% faster).
  Material for any interactive flow but `derive_profile_from_label`
  is fired once-per-target, asynchronously, so this is a small win.

## Methodology trade-offs

- 10 labels is enough to bound the question for ROUTINE labels but
  may underweight tail roles. The chosen spread (IC tech, eng
  leadership, ops leadership, data, design, content, ops/manufacturing)
  is representative of the role mix in the 3 prod-active targets.
- Single user payload (the first eval fixture's). The slim shape is
  user-conditional; a second user payload might shift the Jaccards
  slightly but not the bottom-line "Sonnet 4.5 diverges meaningfully"
  finding.
- Schema-validation failures were excluded from the Jaccard mean
  rather than treated as 0.0 — that's a more honest read of model
  divergence on the rows where BOTH succeeded. The 5/10 vs 7/10
  validation-rate gap is reported separately above.

## Action

- No prod change to `derive_profile_from_label.py`. Continue on
  `claude-sonnet-4-6`.
- File a follow-up to tighten the description-length rule in
  `SYSTEM_PROMPT` (or raise the Pydantic `max_length` to 1000) — both
  Sonnets need this and it's currently silently dropping derivations
  for ~30-50% of dense labels.
