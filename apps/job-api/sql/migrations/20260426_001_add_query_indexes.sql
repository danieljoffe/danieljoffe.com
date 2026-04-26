-- Migration: Add composite and partial indexes for query optimization
-- Date: 2026-04-26
-- Context: Optimizes the two most common query paths:
--   1. Target-filtered job list (sorted by score)
--   2. Active target lookups

-- Composite index on job_target_scores: covers the target-filtered job list query
-- which filters by (target_id, excluded) and sorts by score DESC.
-- Eliminates sort step and supports the paginated scores-first query pattern.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jts_target_score
  ON job_target_scores (target_id, excluded, score DESC);

-- Partial index on job_targets: only indexes active targets.
-- Most targets are inactive (historical), so this is much smaller than a full index
-- and serves the common "get active targets" query used during polling and manual entry.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_targets_active_only
  ON job_targets (is_active) WHERE is_active = true;

-- Composite index on job_analyses: covers the cache lookup pattern
-- which filters by (job_posting_id, user_id) and orders by created_at DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analyses_cache_lookup
  ON job_analyses (job_posting_id, user_id, created_at DESC);

-- Index on experience_prose_docs for the "get latest version" query
-- which filters by user_id and orders by version DESC.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prose_user_version
  ON experience_prose_docs (user_id, version DESC);
