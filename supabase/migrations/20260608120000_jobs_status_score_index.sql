-- Composite index for the /jobs list hot path.
--
-- `apps/wyrdfold-api/app/routers/jobs.py` filters `status` and (optionally)
-- `score >= min_score`, then orders by `score DESC`. Existing single-column
-- indexes (`idx_job_postings_score`, `idx_job_postings_status`) force the
-- planner to combine bitmap scans; a `(status, score DESC)` composite serves
-- the filter and ordering from one btree.
--
-- btree default for DESC is NULLS LAST, which matches user intent (unscored
-- jobs sort to the end). Single-column legacy indexes are kept — they still
-- serve queries that filter on score alone or status alone.

CREATE INDEX IF NOT EXISTS idx_jobs_status_score
  ON public.jobs (status, score DESC);
