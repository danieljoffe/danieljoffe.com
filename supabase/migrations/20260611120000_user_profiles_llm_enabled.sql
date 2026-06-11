-- Operator kill-switch for per-account LLM spend.
--
-- FALSE blocks all of a user's LLM work: user-triggered endpoints 429
-- and the poller defers their targets' background grading (jobs still
-- ingest). Distinct from the budget override, where 0 means "window
-- disabled" (unlimited), not blocked.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS llm_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_profiles.llm_enabled IS
  'Operator kill-switch: FALSE blocks all LLM spend for this account (429 + poller defer).';
