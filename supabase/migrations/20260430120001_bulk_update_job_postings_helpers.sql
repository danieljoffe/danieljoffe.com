-- Two RPC helpers that turn N row-by-row UPDATEs into a single statement.
--   * bulk_update_job_scores   — used after rescoring batches of jobs
--   * bulk_update_job_salaries — used by the one-off backfill-salary endpoint
--
-- Both accept a JSONB array of `{id, …}` objects so the caller can ship a
-- whole batch in one round-trip. The UPDATE … FROM jsonb_to_recordset(…)
-- form lets Postgres plan a single hashed join instead of N PK lookups.

CREATE OR REPLACE FUNCTION public.bulk_update_job_scores(p_updates jsonb)
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
  UPDATE public.job_postings jp
  SET    score = u.score
  FROM   u
  WHERE  jp.id = u.id;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

ALTER FUNCTION public.bulk_update_job_scores(jsonb)
  SET search_path = public, pg_catalog;

CREATE OR REPLACE FUNCTION public.bulk_update_job_salaries(p_updates jsonb)
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
  UPDATE public.job_postings jp
  SET    salary_text = u.salary_text
  FROM   u
  WHERE  jp.id = u.id;

  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END;
$$;

ALTER FUNCTION public.bulk_update_job_salaries(jsonb)
  SET search_path = public, pg_catalog;
