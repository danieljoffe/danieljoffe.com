-- Aggregation view for /api/audit/insights/domains (roadmap #408 Phase 3,
-- issue #104). Counts scans per domain and reports the latest grade per
-- domain. Domains are public — anyone can scan any URL via the audit tool —
-- so no anonymization is needed.
--
-- The CTE chain extracts the host from normalized_url first, then uses
-- DISTINCT ON to pick the most recent completed scan per domain. This avoids
-- a correlated subquery in the SELECT list.

CREATE OR REPLACE VIEW insights_domains_view AS
WITH scans_with_domain AS (
  SELECT
    split_part(split_part(normalized_url, '://', 2), '/', 1) AS domain,
    grade_overall,
    completed_at
  FROM scans
  WHERE status = 'completed'
),
latest_per_domain AS (
  SELECT DISTINCT ON (domain)
    domain,
    grade_overall AS latest_grade,
    completed_at AS latest_scan_at
  FROM scans_with_domain
  ORDER BY domain, completed_at DESC NULLS LAST
)
SELECT
  swd.domain,
  COUNT(*)::int AS scan_count,
  lpd.latest_grade,
  lpd.latest_scan_at
FROM scans_with_domain swd
JOIN latest_per_domain lpd USING (domain)
GROUP BY swd.domain, lpd.latest_grade, lpd.latest_scan_at
ORDER BY scan_count DESC, swd.domain ASC;
