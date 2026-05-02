-- ============================================
-- MIGRATION: WyrdFold rename pass (#592)
-- ============================================
--
-- Strips the redundant `job_` prefix from tables in the wyrdfold
-- (formerly /fitted) namespace, disambiguates `batch_jobs` vs job postings,
-- renames `tailored_resumes` to `documents` (it now also holds cover letters),
-- and consolidates ancillary names. See
-- .claude/docs/wyrdfold-migration/supabase-schema.md §8 for the full mapping.
--
-- Scope: tables, functions, triggers, named constraints. Column names and
-- explicit index names are intentionally left alone — they're internal and
-- the noise of renaming them isn't worth the codemod blast radius.
--
-- Functions that embed renamed table names in their bodies (or return type)
-- must be DROP + CREATE'd. CREATE OR REPLACE alone won't repair a
-- `RETURNS SETOF <renamed_table>` signature.

-- ------------------------------------------------------------
-- 1. Drop dependent functions before renaming their backing tables.
-- ------------------------------------------------------------
DROP FUNCTION IF EXISTS public.bulk_update_job_scores(jsonb);
DROP FUNCTION IF EXISTS public.bulk_update_job_salaries(jsonb);
DROP FUNCTION IF EXISTS public.match_target_by_label(TEXT, FLOAT);
DROP FUNCTION IF EXISTS public.get_target_jobs(UUID, INT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, INT, INT);

-- ------------------------------------------------------------
-- 2. Rename tables.
-- ------------------------------------------------------------
ALTER TABLE IF EXISTS public.job_postings              RENAME TO jobs;
ALTER TABLE IF EXISTS public.job_targets               RENAME TO targets;
ALTER TABLE IF EXISTS public.job_sources               RENAME TO sources;
ALTER TABLE IF EXISTS public.job_status_log            RENAME TO status_log;
ALTER TABLE IF EXISTS public.job_analyses              RENAME TO analyses;
ALTER TABLE IF EXISTS public.job_target_scores        RENAME TO scores;
ALTER TABLE IF EXISTS public.job_notification_sent     RENAME TO notifications_sent;
ALTER TABLE IF EXISTS public.target_reference_jds      RENAME TO reference_jds;
ALTER TABLE IF EXISTS public.batch_jobs                RENAME TO batch_runs;
ALTER TABLE IF EXISTS public.tailored_resumes          RENAME TO documents;
ALTER TABLE IF EXISTS public.tailored_resume_versions  RENAME TO document_versions;
ALTER TABLE IF EXISTS public.resume_uploads            RENAME TO uploaded_resumes;
ALTER TABLE IF EXISTS public.llm_cost_log              RENAME TO llm_costs;

-- ------------------------------------------------------------
-- 3. Rename named CHECK / UNIQUE constraints.
--    Anonymous constraints (FKs, _key, _check) auto-rename when the table
--    rename matches Postgres' default naming rules; the ones below were
--    created with explicit names, so we rename them by hand.
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_postings_status_check'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs
      RENAME CONSTRAINT job_postings_status_check TO jobs_status_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_postings_score_check'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs
      RENAME CONSTRAINT job_postings_score_check TO jobs_score_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_postings_source_external_unique'
      AND conrelid = 'public.jobs'::regclass
  ) THEN
    ALTER TABLE public.jobs
      RENAME CONSTRAINT job_postings_source_external_unique TO jobs_source_external_unique;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_notification_sent_channel_check'
      AND conrelid = 'public.notifications_sent'::regclass
  ) THEN
    ALTER TABLE public.notifications_sent
      RENAME CONSTRAINT job_notification_sent_channel_check TO notifications_sent_channel_check;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_notification_sent_user_profile_job_channel_key'
      AND conrelid = 'public.notifications_sent'::regclass
  ) THEN
    ALTER TABLE public.notifications_sent
      RENAME CONSTRAINT job_notification_sent_user_profile_job_channel_key
                     TO notifications_sent_user_profile_job_channel_key;
  END IF;
END$$;

-- ------------------------------------------------------------
-- 4. Recreate functions with new names + updated bodies pointing at
--    renamed tables.
-- ------------------------------------------------------------

-- bulk_update_job_scores → bulk_update_scores
CREATE OR REPLACE FUNCTION public.bulk_update_scores(p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt integer;
BEGIN
  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN 0;
  END IF;

  WITH u AS (
    SELECT (elem->>'id')::uuid    AS id,
           (elem->>'score')::int  AS score
    FROM   jsonb_array_elements(p_updates) elem
  )
  UPDATE public.jobs jp
  SET    score = u.score
  FROM   u
  WHERE  jp.id = u.id;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

ALTER FUNCTION public.bulk_update_scores(jsonb)
  SET search_path = public, pg_catalog;

-- bulk_update_job_salaries → bulk_update_salaries
CREATE OR REPLACE FUNCTION public.bulk_update_salaries(p_updates jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  cnt integer;
BEGIN
  IF p_updates IS NULL OR jsonb_array_length(p_updates) = 0 THEN
    RETURN 0;
  END IF;

  WITH u AS (
    SELECT (elem->>'id')::uuid       AS id,
           (elem->>'salary_text')    AS salary_text
    FROM   jsonb_array_elements(p_updates) elem
  )
  UPDATE public.jobs jp
  SET    salary_text = u.salary_text
  FROM   u
  WHERE  jp.id = u.id;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

ALTER FUNCTION public.bulk_update_salaries(jsonb)
  SET search_path = public, pg_catalog;

-- match_target_by_label: same name, return type now SETOF targets
CREATE OR REPLACE FUNCTION public.match_target_by_label(
  query_label TEXT,
  threshold FLOAT DEFAULT 0.7
)
RETURNS SETOF public.targets
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.targets
  WHERE similarity(normalized_label, query_label) >= threshold
  ORDER BY similarity(normalized_label, query_label) DESC
  LIMIT 1;
$$;

-- get_target_jobs: same name, body now joins scores ↔ jobs
CREATE OR REPLACE FUNCTION public.get_target_jobs(
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
    CASE WHEN p_sort = 'title' AND p_ascending THEN jp.title END ASC NULLS LAST
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- sync_target_active: trigger function — body now references targets/user_targets.
-- CREATE OR REPLACE keeps the existing trg_sync_target_active binding intact.
CREATE OR REPLACE FUNCTION public.sync_target_active() RETURNS trigger AS $$
DECLARE
  _target_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _target_id := OLD.target_id;
  ELSE
    _target_id := NEW.target_id;
  END IF;

  UPDATE public.targets SET is_active = EXISTS(
    SELECT 1 FROM public.user_targets
    WHERE target_id = _target_id AND is_active = TRUE
  ) WHERE id = _target_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
