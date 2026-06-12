-- The /insights/pipeline endpoint reads `job_status_log` filtered solely
-- by `created_at >= since` (the per-posting grouping happens in Python),
-- so a btree on `created_at` is what serves the range scan. The existing
-- `idx_job_status_log_posting` covers posting_id lookups but doesn't help
-- this query.
--
-- `llm_cost_log.created_at` is already indexed by
-- `idx_llm_cost_log_created_at` from the original create migration; no
-- change needed there.

CREATE INDEX IF NOT EXISTS idx_job_status_log_created_at
  ON public.job_status_log(created_at DESC);
