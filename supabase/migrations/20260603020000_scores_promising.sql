-- Phase 1 LLM title triage verdict per (job, target) pair.
--
-- See ``app/services/relevance/title_triage.py`` for the grading
-- logic. The Phase 1 grader replaces the cosine prefilter as the
-- ingestion-time gate.
--
-- State semantics
--   NULL  — legacy row (created before Phase 1 shipped, or while
--           the feature flag was off, or the LLM was unavailable
--           and we fail-opened the job through).
--   TRUE  — Phase 1 graded this row PROMISING; it's a Phase 2
--           candidate.
--   FALSE — not currently used. Phase 1-rejected jobs are not
--           ingested under this target, so no scores row exists.
--           Column accepts the value for future use (e.g., if we
--           add a "show rejected" debug view) but the ingestion
--           path never writes it.
--
-- No index in this migration. The Phase 2 PR will add a partial
-- index ``ON scores (target_id, score DESC) WHERE promising IS TRUE``
-- once the Phase 2 candidate-selection query actually exists.

alter table public.scores
  add column if not exists promising boolean;

comment on column public.scores.promising is
  'Phase 1 LLM title triage verdict. NULL = legacy/pre-Phase-1/fail-open, '
  'TRUE = admitted by Phase 1, FALSE = unused (rejected jobs are not '
  'ingested so no row exists).';
