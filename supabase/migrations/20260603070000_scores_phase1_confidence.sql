-- Phase 1 confidence (open question #4 from plan-llm-scoring-migration.md).
--
-- Phase 1 (Haiku title triage) emits a binary promising/unpromising verdict
-- per job. Open question #4 was answered "yes — capture confidence (0-100)
-- alongside the bool". This column persists that confidence so:
--   1. ``phase2_runner`` can order candidates by phase1_confidence DESC
--      instead of first_seen_at — highest-likelihood-promising jobs get the
--      daily Sonnet cap first.
--   2. The relevance diagnosis can plot confidence-vs-Phase-2-score
--      correlation (should be positive; flat = Phase 1 noise).
--   3. We can later derive a confidence floor (e.g. only grade jobs with
--      phase1_confidence >= 70) to cut Phase 2 spend ~50% with negligible
--      precision loss.
--
-- NULL is the legacy state — rows triaged before this column existed, or
-- ones where the LLM response didn't include a confidence value
-- (forward-compat). phase2_runner treats NULL as "lowest priority" so old
-- rows still grade but new high-confidence ones go first.

alter table public.scores
  add column if not exists phase1_confidence integer
    check (phase1_confidence is null or (phase1_confidence between 0 and 100));

comment on column public.scores.phase1_confidence is
  'Phase 1 LLM confidence (0-100) in its promising/unpromising verdict for '
  'this (job, target) pair. NULL on legacy rows or when the Phase 1 response '
  'lacked a confidence value. Used by phase2_runner to order candidates '
  '(highest confidence first) and by relevance diagnostics to validate '
  'whether Phase 1 confidence predicts Phase 2 score.';
