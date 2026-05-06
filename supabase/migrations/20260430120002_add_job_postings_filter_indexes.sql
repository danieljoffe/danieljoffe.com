-- Index two columns the /jobs list endpoint filters on but had no index for:
--   * company_name — exact-match filter (`.eq("company_name", company)`)
--   * title        — case-insensitive substring filter (`.ilike("%search%")`)
--
-- The btree on company_name serves equality lookups in O(log n). The GIN
-- trigram index on title is what makes leading-wildcard ILIKE actually use
-- an index instead of a sequential scan; pg_trgm is already enabled in this
-- project (see idx_job_targets_normalized_label_trgm).

CREATE INDEX IF NOT EXISTS idx_job_postings_company_name
  ON public.job_postings(company_name);

CREATE INDEX IF NOT EXISTS idx_job_postings_title_trgm
  ON public.job_postings
  USING GIN (title gin_trgm_ops);
