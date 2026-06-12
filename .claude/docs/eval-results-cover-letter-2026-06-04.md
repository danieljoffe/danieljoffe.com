# Eval Results: Cover Letter (Sonnet 4.6 vs GPT-5.1 vs Haiku 4.5)

**Date:** 2026-06-04
**Eval script:** `apps/wyrdfold-api/scripts/eval_cover_letter.py`
**Raw results:** `apps/wyrdfold-api/scripts/eval_results/eval_cover_letter_20260604T002723.json`
**Anonymized drafts:** `apps/wyrdfold-api/scripts/eval_results/eval_cover_letter_20260604T002723.md`
**Plan:** `.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md` — Eval 2
**Unblocks:** PR D from `plan-wyrdfold-openrouter-migration.md`

## Recommendation

**TENTATIVE: GPT-5.1 is a viable swap from Sonnet 4.6 for cover-letter
generation, pending Daniel's blind spot-check.** The Opus 4.7 judge data
points the same direction (GPT-5.1 beats Sonnet on average rank), but
this is a creative/subjective output and the plan's binding threshold is
human picks ≥3/5 for GPT-5.1 (wins or ties).

**STATUS: AWAITING DANIEL'S BLIND PICK.** See "Please pick" section in
the anonymized drafts markdown — read each blind, reply with your top
pick (or tie) per case, then we cross-reference against the
model->draft-letter mapping in the raw JSON.

## Opus 4.7 judge results (corroborating signal only)

5 cases × 3 anonymized drafts (A/B/C, shuffled per case). Judge scored
each draft 0-2 on persuasiveness, specificity, JD-alignment, then ranked
1-3.

| Model      | Rank-1 wins | Top-2 finishes | Mean total score (max 6) | Mean rank |
| ---------- | ----------- | -------------- | ------------------------ | --------- |
| sonnet-4.6 | 2/5         | 2/5            | 3.20                     | 2.20      |
| gpt-5.1    | 2/5         | **4/5**        | 3.80                     | **1.80**  |
| haiku-4.5  | 1/5         | 4/5            | **4.00**                 | 2.00      |

Two surprises here:

1. **Sonnet 4.6 has the worst average rank** under the Opus judge,
   despite being the production baseline. The judge frequently
   penalised Sonnet drafts for being long but vague.
2. **Haiku 4.5 hits the highest mean total score** despite winning the
   fewest rank-1 votes — it's consistently in the top-2 because it's
   shorter and more direct, which the judge rewards on specificity.

These judge data points are CORROBORATING SIGNAL ONLY per the plan.
Cover letters are subjective; the human blind pick is what binds.

## Cost / latency

| Model      | Schema fails | $ total | Avg latency |
| ---------- | ------------ | ------- | ----------- |
| sonnet-4.6 | 0/5          | ~$0.21  | ~37s        |
| gpt-5.1    | 1/5          | ~$0.04  | ~30s        |
| haiku-4.5  | 0/5          | ~$0.05  | ~17s        |

Judge (Opus 4.7) total: $0.11.
**Total eval cost: ~$0.42** (well under the $2 plan estimate).

Cost delta if we swap to GPT-5.1: **~5× cheaper than Sonnet** per cover
letter generated. At current low volume the absolute saving is small
(~$0.04/letter), but on a per-call basis it's material.

## Methodology trade-offs

- One user payload (Daniel's). The cover-letter prompt is heavily
  user-conditional, so a single user means we can't tell whether
  GPT-5.1's edge is general or Daniel-specific. A second payload run
  (Melissa or another fixture user when available) would strengthen
  the finding.
- The script extracts paragraph prose loosely (paragraphs / body /
  content keys) because GPT-5.1 and Haiku emit slightly different
  schema shapes than the strict TailoredCoverLetter Pydantic model
  expects. One Haiku draft failed paragraph extraction; everything
  else parsed cleanly. If we swap, the production
  validate_cover_letter_refs path would need the same leniency.
- LLM judge is Opus 4.7. We assumed the judge has no
  Sonnet-vs-GPT-vs-Haiku bias. That's a reasonable but unproven
  assumption — the human pick guards against any judge bias.

## Action checklist

- [ ] Daniel: read the anonymized drafts in
      `apps/wyrdfold-api/scripts/eval_results/eval_cover_letter_20260604T002723.md`,
      pick the strongest letter (or tie) per case, then check raw
      JSON for the model mapping.
- [ ] If GPT-5.1 wins/ties ≥3/5: ship PR D (swap
      `DEFAULT_MODEL` in `app/services/tailor/tailor.py` for
      `DEFAULT_COVER_LETTER_PURPOSE`) and update the cover-letter
      parser to handle the slight schema variance noted above.
- [ ] If GPT-5.1 loses ≥3/5: stay on Sonnet 4.6 and re-run with the
      next user-payload candidate when available.
- [ ] In either case: investigate why Haiku scored as well as it did
      — there may be a separate "cheap-tier preview" use case
      (interactive draft preview before the user commits to a full
      Sonnet generation) worth opening as a follow-up.
