-- Logistics filters extracted by the Phase 2 grader (groundwork for
-- plan-wyrdfold-logistics-chips.md).
--
-- Phase 2 (Sonnet) already reads the full JD to produce axis_scores.
-- A follow-up PR will extend the same prompt to emit a structured
-- logistics JSON section per (job, target) at near-zero token cost.
-- This migration is the schema half: ships now so the column is in
-- place when the prompt change lands.
--
-- Shape (v1):
--   {
--     "remote_status": "remote" | "hybrid" | "onsite" | "unspecified",
--     "salary_min": int | null,
--     "salary_max": int | null,
--     "salary_currency": "USD" | ...  | null,
--     "salary_unit": "year" | "hour" | null,
--     "location_city": "San Francisco" | null,
--     "location_country": "US" | null
--   }
--
-- Powers the /jobs chips and filter pills (?remote_only=true,
-- ?min_salary=150000, ?country=US). Informational / filter-only —
-- NEVER folded into score or sort order. The axis weights mechanism
-- on user_targets is the score-tuning surface; this is the list-
-- filtering surface. See "Concepts" in
-- plan-wyrdfold-streamlined-target.md for the canonical vocabulary.
--
-- Behaviorally neutral on its own: until the Phase 2 prompt change
-- lands, the column stays NULL on every new row and no consumer
-- reads it. The accompanying Pydantic model is documentation /
-- validation only at this stage.

alter table public.scores
  add column if not exists logistics_filters jsonb;

comment on column public.scores.logistics_filters is
  'Structured logistics fields extracted by the Phase 2 grader: '
  '{remote_status, salary_min, salary_max, salary_currency, salary_unit, '
  'location_city, location_country}. Powers /jobs logistics chips and '
  'filter pills. Filter-only — NOT used in scoring or sort order. See '
  'plan-wyrdfold-logistics-chips.md for the extraction contract.';

-- No CHECK constraint on the JSON shape; the API layer (Pydantic
-- LogisticsFilters model) enforces field types and the remote_status
-- enum at read/write time.
