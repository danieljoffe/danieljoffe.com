-- Indexes supporting the insights aggregation views/functions added in
-- migrations 20260420120000–20260420160000 (roadmap #408 Phase 3, issue #104).
--
-- Every insights query filters scans by `status = 'completed'`. A partial
-- index avoids touching rows in other states and keeps the index small.
-- The composite (status, completed_at DESC) shape also serves the trends
-- function's date-bucketed scans, eliminating a sort.
CREATE INDEX IF NOT EXISTS idx_scans_completed_at
  ON scans (status, completed_at DESC)
  WHERE status = 'completed';

-- The violations view groups scan_issues by (category, title) and reports
-- per-severity counts. A composite (category, severity) index lets the
-- aggregator skip the large severity scan when filtering by category.
CREATE INDEX IF NOT EXISTS idx_scan_issues_category_severity
  ON scan_issues (category, severity);
