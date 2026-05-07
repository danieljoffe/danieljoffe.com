-- Raise default trigram threshold for match_target_by_label.
--
-- Why: 0.4 was too permissive — distinct specializations like
-- "Senior Backend Engineer" and "Senior Frontend Engineer" share
-- "senior", "engineer", and the suffix, scoring ~0.59 similarity
-- and getting silently merged. 0.7 keeps legitimate fuzzy matches
-- (e.g., "sr fe eng" → "Senior Frontend Engineer", typos, casing)
-- while breaking specialization collisions.

CREATE OR REPLACE FUNCTION match_target_by_label(
  query_label TEXT,
  threshold FLOAT DEFAULT 0.7
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
