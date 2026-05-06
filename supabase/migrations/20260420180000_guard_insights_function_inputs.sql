-- Defense-in-depth bounds checks inside the insights_trends and
-- insights_score_stats functions (roadmap #408 Phase 3, issue #104).
--
-- The HTTP routes already validate inputs, but service-role callers can
-- invoke these functions directly. Reject unsupported bucket_interval
-- values and clamp the period parameters to sane bounds so callers can't
-- ask for unbounded scans of `scans`.

CREATE OR REPLACE FUNCTION insights_trends(
  bucket_interval text DEFAULT 'week',
  period_months int DEFAULT 6
)
RETURNS TABLE (
  bucket_start timestamptz,
  avg_overall numeric,
  scan_count int
)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF bucket_interval NOT IN ('week', 'month') THEN
    RAISE EXCEPTION 'invalid bucket_interval: %', bucket_interval
      USING ERRCODE = '22023';
  END IF;
  IF period_months IS NULL OR period_months < 1 OR period_months > 60 THEN
    RAISE EXCEPTION 'invalid period_months: %', period_months
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
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
END;
$$;

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
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
BEGIN
  IF period_days IS NOT NULL AND (period_days < 1 OR period_days > 365) THEN
    RAISE EXCEPTION 'invalid period_days: %', period_days
      USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
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
END;
$$;
