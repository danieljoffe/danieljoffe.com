-- Postgres-side LLM spend aggregation for the budget guard hot path.
--
-- Before this migration, `cost_log.total_spend` selected every
-- `cost_usd` row in the rolling window and summed in Python. On heavy
-- users the payload grew linearly with usage, taxing both the database
-- IO and the API process. The guard runs on every authenticated LLM
-- call, so the linear scan was visible in p95 latency.
--
-- These two functions move the work into Postgres:
--   * total_spend_since(p_user_id, p_since)        → numeric (sum)
--   * spend_by_purpose_since(p_user_id, p_since)   → jsonb {purpose: sum}
--
-- Both treat `p_user_id IS NULL` as "match the cron/poller rows whose
-- `user_id` is NULL" (matching the existing Python semantics) and
-- `p_since IS NULL` as "no time filter" (full-history total). Marked
-- STABLE so the planner can cache the result inside a single statement.
--
-- SECURITY INVOKER: the API process talks to Supabase with the service
-- role, which bypasses RLS, so no DEFINER escalation is needed. Callers
-- that hit the function via the anon role will see only their own rows
-- through the existing `Users read their own llm_costs` policy.

CREATE OR REPLACE FUNCTION public.total_spend_since(
  p_user_id uuid,
  p_since   timestamptz
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(SUM(cost_usd), 0)::numeric
  FROM   public.llm_costs
  WHERE  (
           (p_user_id IS NULL AND user_id IS NULL)
           OR user_id = p_user_id
         )
    AND  (p_since IS NULL OR created_at >= p_since);
$$;

CREATE OR REPLACE FUNCTION public.spend_by_purpose_since(
  p_user_id uuid,
  p_since   timestamptz
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  SELECT COALESCE(
           jsonb_object_agg(purpose, total),
           '{}'::jsonb
         )
  FROM (
    SELECT purpose,
           SUM(cost_usd)::numeric AS total
    FROM   public.llm_costs
    WHERE  (
             (p_user_id IS NULL AND user_id IS NULL)
             OR user_id = p_user_id
           )
      AND  (p_since IS NULL OR created_at >= p_since)
    GROUP BY purpose
  ) g;
$$;

-- Supporting index. Partial-by-NULL would be tempting but the budget
-- guard runs against the per-user partition (user_id = $) on every
-- call, which is the dominant access pattern; a regular composite
-- index covers both the per-user-since and global-since lookups.
CREATE INDEX IF NOT EXISTS llm_costs_user_id_created_at_idx
  ON public.llm_costs (user_id, created_at DESC);
