-- Fuzzy target matching RPC using pg_trgm (#553 Phase 3)
--
-- Returns the best-matching job_target row for a given label,
-- using trigram similarity. Falls back gracefully if no match
-- exceeds the threshold.

CREATE OR REPLACE FUNCTION match_target_by_label(
  query_label TEXT,
  threshold FLOAT DEFAULT 0.4
)
RETURNS SETOF job_targets
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM job_targets
  WHERE similarity(normalized_label, query_label) >= threshold
  ORDER BY similarity(normalized_label, query_label) DESC
  LIMIT 1;
$$;
