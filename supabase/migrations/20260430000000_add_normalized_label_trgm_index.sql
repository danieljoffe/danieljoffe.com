-- Replace the btree index on job_targets.normalized_label with a GIN trigram
-- index. The fuzzy-match RPC `match_target_by_label` calls
-- `similarity(normalized_label, $1)` (pg_trgm operator) which a btree cannot
-- accelerate — every fuzzy-match query was a full table scan with per-row
-- trigram computation.
--
-- The exact-match path in `find_matching_target` (eq normalized_label) is
-- still well-served by GIN — pg_trgm GIN indexes support `=` lookups too.

DROP INDEX IF EXISTS idx_job_targets_normalized_label;

CREATE INDEX IF NOT EXISTS idx_job_targets_normalized_label_trgm
  ON job_targets USING GIN (normalized_label gin_trgm_ops);
