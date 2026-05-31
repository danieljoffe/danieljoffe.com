-- Migrate ``jobs.external_id`` from BIGINT to TEXT.
--
-- Why: the column was added when Greenhouse was the only ATS we polled
-- (its job IDs are numeric, e.g. 5734303004). Lever, Ashby, Workday, and
-- SmartRecruiters all use either UUIDs or arbitrary opaque strings as
-- posting IDs. Now that PRs #745/#746 have actually seeded sources for
-- the other four providers and PR #749 made polling go end-to-end, every
-- non-Greenhouse upsert is dying on Postgres' bigint cast:
--
--   postgrest.exceptions.APIError: invalid input syntax for type
--   bigint: "b79fcb2f-1d69-42b6-babf-3b2bc545a33e"
--
-- Production logs (2026-05-31) show this failure for Illumio, Deliveroo,
-- OpenAI, Palantir, Pigment, UiPath, Xero, Stability AI, and others —
-- all real, polling-successfully-from-the-fetcher sources whose jobs
-- never reach the database.
--
-- Fix: switch the column to TEXT. Existing Greenhouse rows ('5734303004'
-- as bigint → '5734303004' as text) remain queryable; new
-- Lever/Ashby/Workday/SR rows can finally insert.
--
-- Idempotent via ``IF`` guards on the column type and the function
-- signature. Re-running the migration after it's applied is a no-op.
--
-- Touches:
--   1. ``jobs.external_id``                       — BIGINT → TEXT
--   2. ``get_target_jobs`` RPC return-type ``external_id`` — BIGINT → TEXT
--   3. The unique constraint ``(source_id, external_id)`` is preserved
--      automatically by the ALTER COLUMN — Postgres re-validates on
--      cast, and ``bigint::text`` is total + injective so no row will
--      collide that didn't already collide.

-- --------------------------------------------------------------------
-- 1. ALTER the column. The USING clause handles the existing data.
-- --------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'jobs'
      AND column_name = 'external_id'
      AND data_type = 'bigint'
  ) THEN
    ALTER TABLE public.jobs
      ALTER COLUMN external_id TYPE TEXT USING external_id::text;
  END IF;
END $$;

-- --------------------------------------------------------------------
-- 2. Recreate ``get_target_jobs`` with ``external_id TEXT`` so the
--    RPC's RETURNS TABLE matches the new column type. DROP first
--    because Postgres won't ALTER a function's return-row shape.
--    Body is otherwise identical to migration 20260528160000 (stable
--    pagination tiebreaker + scoring_status from PR #689 era).
-- --------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_target_jobs(
  UUID, INT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT
);

CREATE FUNCTION public.get_target_jobs(
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
  scoring_status TEXT,
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
    s.score,
    s.score_breakdown,
    s.scoring_status,
    jp.status,
    jp.salary_text,
    jp.greenhouse_updated_at,
    jp.first_seen_at,
    jp.created_at,
    COUNT(*) OVER () AS total_count
  FROM public.scores s
  INNER JOIN public.jobs jp ON jp.id = s.job_posting_id
  WHERE s.target_id = p_target_id
    AND s.excluded = FALSE
    AND s.score >= p_min_score
    AND (p_status IS NULL OR jp.status = p_status)
    AND (p_company IS NULL OR jp.company_name = p_company)
    AND (p_search IS NULL OR jp.title ILIKE '%' || p_search || '%')
  ORDER BY
    CASE WHEN p_sort = 'score' AND NOT p_ascending THEN s.score END DESC NULLS LAST,
    CASE WHEN p_sort = 'score' AND p_ascending THEN s.score END ASC NULLS LAST,
    CASE WHEN p_sort = 'created_at' AND NOT p_ascending THEN jp.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'created_at' AND p_ascending THEN jp.created_at END ASC NULLS LAST,
    CASE WHEN p_sort = 'company_name' AND NOT p_ascending THEN jp.company_name END DESC NULLS LAST,
    CASE WHEN p_sort = 'company_name' AND p_ascending THEN jp.company_name END ASC NULLS LAST,
    CASE WHEN p_sort = 'title' AND NOT p_ascending THEN jp.title END DESC NULLS LAST,
    CASE WHEN p_sort = 'title' AND p_ascending THEN jp.title END ASC NULLS LAST,
    -- Deterministic tiebreaker (PR #733) — every row has exactly one
    -- position in the result set so LIMIT/OFFSET paging is disjoint.
    jp.id ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;
