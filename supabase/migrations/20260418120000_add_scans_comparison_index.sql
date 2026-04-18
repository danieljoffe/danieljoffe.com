-- Compound index for "previous scan" lookups (roadmap #408 Phase 2, issue #81).
-- Comparison reports query the most recent other completed scan for the same
-- normalized URL + device mode. Existing single-column indexes on
-- normalized_url, status, and created_at cannot be combined efficiently for
-- this predicate + ORDER BY.
--
-- Predicate: (normalized_url = $1 AND status = 'completed' AND device_mode = $2 AND id != $3)
-- Sort:      ORDER BY created_at DESC
-- Limit:     1
--
-- Partial index keyed on completed scans only keeps the index small — pending/
-- running/failed rows are irrelevant to comparison lookups.

CREATE INDEX IF NOT EXISTS idx_scans_comparison_lookup
  ON scans (normalized_url, device_mode, created_at DESC)
  WHERE status = 'completed';
