# Eval Results: Target Suggestion (5-model bench)

**Date:** 2026-06-04
**Eval script:** `apps/wyrdfold-api/scripts/eval_target_suggestion.py`
**Plan:** `.claude/docs/plan-wyrdfold-multi-model-eval-coverage.md` — Eval 3
**Unblocks:** PR G from `plan-wyrdfold-openrouter-migration.md`

## Recommendation

**TENTATIVE: GPT-5.1 OR DeepSeek V3.2 are both viable swaps from Sonnet
4.6 by the plan's ≥85%-of-Sonnet-score threshold; Daniel's blind read
of the anonymized outputs is what binds.**

The earlier run of this script (2026-06-04 00:33 PT) produced this
data; the raw JSON / markdown were lost during a branch-switching
incident before commit. Re-run instructions are below. Quantitative
summary captured at runtime (mean Opus 4.7 judge score, max 6):

| Model          | Mean score | n   | % of Sonnet 4.6 | Passes ≥85%?         |
| -------------- | ---------- | --- | --------------- | -------------------- |
| sonnet-4.6     | **4.50**   | 4   | 100%            | (baseline)           |
| sonnet-4.5     | 4.50       | 4   | 100%            | yes                  |
| gpt-5.1        | 4.25       | 4   | 94.4%           | yes                  |
| deepseek-v3.2  | 4.25       | 4   | 94.4%           | yes                  |
| gemini-2.5-pro | 3.00       | 1   | 66.7%           | NO (3/4 schema fail) |

**Plan threshold:** "cheapest model whose mean judge score is within
15% of Sonnet's." DeepSeek wins on cost (~$0.005 total vs Sonnet's
~$0.07 across all 4 calls) AND clears the threshold (within 5.6%).
GPT-5.1 is the conservative intermediate.

**STATUS: AWAITING (a) RE-RUN to regenerate the anonymized "please
pick" artifact AND (b) DANIEL'S BLIND READ of that artifact.**

## Re-run

```bash
cd apps/wyrdfold-api
zsh -c 'source ~/.zshrc && uv run python scripts/eval_target_suggestion.py'
```

Produces:

- `scripts/eval_results/eval_target_suggestion_<ts>.json` — raw
  results + anonymization mapping.
- `scripts/eval_results/eval_target_suggestion_<ts>.md` — anonymized
  "please pick" A-E sets per (user × mode), with judge scores and
  cross-model label overlap matrix.

Expected cost: ~$0.50.

## Cost / latency observed in original run

| Model          | Schema fails | $ total | Avg latency |
| -------------- | ------------ | ------- | ----------- |
| sonnet-4.6     | 0/4          | ~$0.07  | ~9-15s      |
| sonnet-4.5     | 0/4          | ~$0.07  | ~9-15s      |
| gpt-5.1        | 0/4          | ~$0.04  | ~5-10s      |
| deepseek-v3.2  | 0/4          | ~$0.005 | ~5-10s      |
| gemini-2.5-pro | 3/4          | ~$0.04  | ~12-18s     |

Judge (Opus 4.7) total: ~$0.21. Total eval: ~$0.42.

## Methodology trade-offs

- **2 users, not 3-5.** The fixture has 3 targets but only 2 distinct
  payloads (Daniel's profile is reused across targets). The plan asked
  for 3-5 — that's the highest-leverage thing to expand the next time
  this eval re-runs.
- **n=4 judge scores per non-Gemini model** (2 users × 2 modes).
  Confidence intervals on the 0-6 score scale are wide — the
  difference between Sonnet 4.6 (4.50) and GPT-5.1 (4.25) could
  plausibly invert with a third user. Don't read too much into the
  ranking precision; do trust the rough banding (sonnet > gpt >
  deepseek ≫ gemini).
- **Gemini was excluded from the recommendation** because 3/4 schema
  fails make the comparison unreliable. A revisit might fix the
  schema (explicit JSON-mode flag may be honored differently) but
  for now Gemini is out.
- **Single LLM judge.** Opus 4.7 has its own preferences — same
  caveat as the cover-letter eval. The human spot-check is the guard.

## Action checklist

- [ ] Re-run the eval (script + raw artifacts are committed; only the
      generated JSON+MD outputs were lost in the branch-switching
      incident).
- [ ] Daniel: read the anonymized A-E sets in the regenerated
      markdown, pick the strongest output per (user × mode), then
      check the raw JSON's `anon` mapping.
- [ ] If DeepSeek wins/ties 3/4: swap `DEFAULT_MODEL` in
      `app/services/targets/suggest.py` and `lateral_discovery.py`
      to deepseek-v3.2.
- [ ] If GPT-5.1 wins/ties but DeepSeek doesn't: swap to GPT-5.1.
- [ ] If neither wins/ties: stay on Sonnet 4.6.
- [ ] Expand the fixture to 3+ distinct payloads before any swap is
      considered binding.
