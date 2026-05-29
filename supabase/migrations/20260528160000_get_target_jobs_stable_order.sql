-- Stabilise `get_target_jobs` pagination by adding a deterministic
-- tiebreaker to the ORDER BY.
--
-- Bug: prior to this migration the ORDER BY only used the user's
-- chosen sort column (score / created_at / company_name / title).
-- Whenever two or more rows shared the same value (very common at
-- score buckets like 43, 46, 48), Postgres' ordering of ties is
-- non-deterministic — so the same row could end up as the LAST
-- entry on page 1 AND the FIRST entry on page 2, producing visible
-- duplicates at every page boundary and silently dropping rows that
-- should appear on later pages.
--
-- Fix: append `jp.id` as a final sort key. UUIDs sort stably; the
-- specific order isn't human-meaningful, but each row has exactly
-- one position in the result set, so paging with LIMIT/OFFSET is
-- now guaranteed to be disjoint.
--
-- The two-query Python fallback in `app/routers/jobs.py` mirrors the
-- same change for the rare case where this RPC isn't deployed.

DROP FUNCTION IF EXISTS get_target_jobs(UUID, INT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT);

CREATE FUNCTION get_target_jobs(
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
  external_id BIGINT,
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
SET search_path = ''
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
  FROM public.job_target_scores jts
  INNER JOIN public.job_postings jp ON jp.id = jts.job_posting_id
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
    CASE WHEN p_sort = 'title' AND p_ascending THEN jp.title END ASC NULLS LAST,
    -- Deterministic tiebreaker — every row has exactly one position
    -- in the result set so LIMIT/OFFSET paging is disjoint.
    jp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
