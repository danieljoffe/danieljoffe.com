-- SQL function backing /api/audit/insights/trends (roadmap #408 Phase 3,
-- issue #104). Buckets completed scans by week or month over a period of
-- the last N months, returning the average overall Lighthouse score and the
-- scan count per bucket.
--
-- bucket_interval is constrained to 'week' or 'month' — date_trunc accepts
-- many values but the route only exposes these two.

CREATE OR REPLACE FUNCTION insights_trends(
  bucket_interval text DEFAULT 'week',
  period_months int DEFAULT 6
)
RETURNS TABLE (
  bucket_start timestamptz,
  avg_overall numeric,
  scan_count int
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    date_trunc(bucket_interval, completed_at) AS bucket_start,
    ROUND(
      AVG(
        (
          COALESCE(score_performance, 0)
          + COALESCE(score_accessibility, 0)
          + COALESCE(score_best_practices, 0)
          + COALESCE(score_seo, 0)
        ) / 4.0
      )::numeric,
      1
    ) AS avg_overall,
    COUNT(*)::int AS scan_count
  FROM scans
  WHERE status = 'completed'
    AND completed_at >= NOW() - (period_months || ' months')::interval
  GROUP BY bucket_start
  ORDER BY bucket_start ASC;
$$;
