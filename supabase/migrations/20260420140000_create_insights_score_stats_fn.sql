-- SQL function backing /api/audit/insights/scores (roadmap #408 Phase 3,
-- issue #104). A function (not a view) because the spec accepts an optional
-- period filter — views can't parameterize.
--
-- Returns one row with averaged Lighthouse scores and the count of completed
-- scans per overall grade. period_days = NULL means all time.

CREATE OR REPLACE FUNCTION insights_score_stats(period_days int DEFAULT NULL)
RETURNS TABLE (
  avg_performance numeric,
  avg_accessibility numeric,
  avg_best_practices numeric,
  avg_seo numeric,
  avg_overall numeric,
  grade_a int,
  grade_b int,
  grade_c int,
  grade_d int,
  grade_f int,
  total int
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    ROUND(AVG(score_performance)::numeric, 1) AS avg_performance,
    ROUND(AVG(score_accessibility)::numeric, 1) AS avg_accessibility,
    ROUND(AVG(score_best_practices)::numeric, 1) AS avg_best_practices,
    ROUND(AVG(score_seo)::numeric, 1) AS avg_seo,
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
    COUNT(*) FILTER (WHERE grade_overall = 'A')::int AS grade_a,
    COUNT(*) FILTER (WHERE grade_overall = 'B')::int AS grade_b,
    COUNT(*) FILTER (WHERE grade_overall = 'C')::int AS grade_c,
    COUNT(*) FILTER (WHERE grade_overall = 'D')::int AS grade_d,
    COUNT(*) FILTER (WHERE grade_overall = 'F')::int AS grade_f,
    COUNT(*)::int AS total
  FROM scans
  WHERE status = 'completed'
    AND (
      period_days IS NULL
      OR completed_at >= NOW() - (period_days || ' days')::interval
    );
$$;
