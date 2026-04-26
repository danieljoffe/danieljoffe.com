-- Migration: Create RPC function for server-side target-jobs join
-- Date: 2026-04-26
-- Context: Replaces the two-roundtrip pattern (fetch scores → fetch postings)
-- with a single server-side join that handles filtering, sorting, and pagination.

CREATE OR REPLACE FUNCTION get_target_jobs(
  p_target_id UUID,
  p_min_score INT DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_company TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'score',
  p_ascending BOOLEAN DEFAULT FALSE,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  external_id TEXT,
  source_id UUID,
  title TEXT,
  company_name TEXT,
  location TEXT,
  department TEXT,
  absolute_url TEXT,
  score INT,
  score_breakdown JSONB,
  status TEXT,
  salary_text TEXT,
  greenhouse_updated_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    jp.id,
    jp.external_id,
    jp.source_id,
    jp.title,
    jp.company_name,
    jp.location,
    jp.department,
    jp.absolute_url,
    jts.score,
    jts.score_breakdown,
    jp.status,
    jp.salary_text,
    jp.greenhouse_updated_at,
    jp.first_seen_at,
    jp.created_at,
    COUNT(*) OVER () AS total_count
  FROM job_target_scores jts
  INNER JOIN job_postings jp ON jp.id = jts.job_posting_id
  WHERE jts.target_id = p_target_id
    AND jts.excluded = FALSE
    AND jts.score >= p_min_score
    AND (p_status IS NULL OR jp.status = p_status)
    AND (p_company IS NULL OR jp.company_name = p_company)
    AND (p_search IS NULL OR jp.title ILIKE '%' || p_search || '%')
  ORDER BY
    CASE WHEN p_sort = 'score' AND NOT p_ascending THEN jts.score END DESC NULLS LAST,
    CASE WHEN p_sort = 'score' AND p_ascending THEN jts.score END ASC NULLS LAST,
    CASE WHEN p_sort = 'created_at' AND NOT p_ascending THEN jp.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'created_at' AND p_ascending THEN jp.created_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'company_name' AND NOT p_ascending THEN jp.company_name END DESC NULLS LAST,
    CASE WHEN p_sort = 'company_name' AND p_ascending THEN jp.company_name END ASC NULLS LAST,
    CASE WHEN p_sort = 'title' AND NOT p_ascending THEN jp.title END DESC NULLS LAST,
    CASE WHEN p_sort = 'title' AND p_ascending THEN jp.title END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
