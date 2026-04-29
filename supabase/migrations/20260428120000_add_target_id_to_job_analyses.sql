-- Add target_id to job_analyses so the analysis cache key becomes
-- (job_posting_id, target_id, optimized_doc_id). Previously the cache
-- was keyed only on (job_posting_id, user_id) and ordered by created_at
-- DESC, which silently returned stale rows after the master doc changed
-- and conflated analyses across targets.
--
-- job_analyses is a derived cache (regenerates from the LLM on demand),
-- so it's safe to truncate before adding the NOT NULL column.

TRUNCATE TABLE job_analyses;

ALTER TABLE job_analyses
  ADD COLUMN target_id UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE;

DROP INDEX IF EXISTS idx_job_analyses_user_job;

CREATE INDEX idx_job_analyses_cache_key
  ON job_analyses(job_posting_id, target_id, optimized_doc_id);
