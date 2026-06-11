-- Per-user cost-cap overrides (LLM cost caps work).
--
-- NULL = global defaults apply (settings: $5/month allowance, 1 active
-- target). The operator bumps a user's row when they "add credits" —
-- the manual lever until a real credits ledger exists.
--
-- Note: llm_costs.user_id is a bare UUID (no FK), so cost history
-- survives account deletion by construction — no FK change needed.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS llm_monthly_budget_usd numeric NULL,
  ADD COLUMN IF NOT EXISTS max_active_targets integer NULL;

COMMENT ON COLUMN public.user_profiles.llm_monthly_budget_usd IS
  'Per-user monthly LLM allowance override (USD, rolling 30d). NULL = settings default.';
COMMENT ON COLUMN public.user_profiles.max_active_targets IS
  'Per-user active-target cap override. NULL = settings default.';
