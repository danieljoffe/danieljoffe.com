-- Composite and partial indexes for query optimization.
-- Optimizes: target-filtered job list, active target lookups,
-- analysis cache hits, and prose doc "get latest" queries.

-- Covers the target-filtered job list query:
-- filters by (target_id, excluded) and sorts by score DESC.
CREATE INDEX IF NOT EXISTS idx_jts_target_score
  ON job_target_scores (target_id, excluded, score DESC);

-- Partial index: only indexes active targets (most are inactive/historical).
CREATE INDEX IF NOT EXISTS idx_targets_active_only
  ON job_targets (is_active) WHERE is_active = true;

-- Covers the analysis cache lookup: (job_posting_id, user_id) + created_at DESC.
CREATE INDEX IF NOT EXISTS idx_analyses_cache_lookup
  ON job_analyses (job_posting_id, user_id, created_at DESC);

-- Covers the "get latest version" query on prose docs.
CREATE INDEX IF NOT EXISTS idx_prose_user_version
  ON experience_prose_docs (user_id, version DESC);
