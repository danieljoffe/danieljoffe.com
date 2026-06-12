-- Aggregation views backing the public insights API (roadmap #408 Phase 3,
-- issue #104). Views run at the DB level so the route handler stays a thin
-- pass-through; ISR caches the response at the edge.
--
-- Service-role queries bypass RLS, so these views work without dedicated
-- grants. They are not exposed to anon/authenticated roles.

-- View: insights_summary_view
-- One row, four columns, drives /api/audit/insights/summary.
--
-- avg_overall_score is the mean of the four Lighthouse scores per scan,
-- averaged across all completed scans. COALESCE keeps a missing sub-score
-- from torpedoing the row's contribution.
--
-- unique_domains extracts the host from normalized_url. normalizeUrl already
-- strips www. and default ports, so split_part on '://' then '/' gives a
-- stable host token.
CREATE OR REPLACE VIEW insights_summary_view
WITH (security_invoker = true) AS
SELECT
  (
    SELECT COUNT(*)::int
    FROM scans
    WHERE status = 'completed'
  ) AS total_scans,
  (
    SELECT COUNT(DISTINCT split_part(split_part(normalized_url, '://', 2), '/', 1))::int
    FROM scans
    WHERE status = 'completed'
  ) AS unique_domains,
  (
    SELECT ROUND(
      AVG(
        (
          COALESCE(score_performance, 0)
          + COALESCE(score_accessibility, 0)
          + COALESCE(score_best_practices, 0)
          + COALESCE(score_seo, 0)
        ) / 4.0
      )::numeric,
      1
    )
    FROM scans
    WHERE status = 'completed'
  ) AS avg_overall_score,
  (
    SELECT si.title
    FROM scan_issues si
    JOIN scans s ON s.id = si.scan_id
    WHERE s.status = 'completed'
    GROUP BY si.title
    ORDER BY COUNT(*) DESC, si.title ASC
    LIMIT 1
  ) AS top_violation;
