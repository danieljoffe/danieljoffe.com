-- Phase 2 LLM job-fit grader output fields.
--
-- ``derive_job_fit`` (PR #791) returns a ``JobFitResult`` with
-- overall fit_score + four axis scores + a short reasoning string.
-- This migration adds the persistence target for the two new pieces:
--
--   axis_scores    — JSONB ``{"title_fit":N, "skills_fit":N,
--                    "seniority_fit":N, "domain_fit":N}``. UI uses
--                    this to render the per-axis breakdown alongside
--                    the overall score.
--
--   fit_reasoning  — 1-2 sentence explanation of the grade. Surfaced
--                    on the job card hover / detail panel.
--
-- The overall fit_score lands in the existing ``scores.score`` INT
-- column (repurposed from keyword-derived to LLM-derived). NULL there
-- now means "Phase 2 not yet run" (was "no keyword match" pre-Phase-2).
--
-- Both columns are nullable so legacy rows that pre-date Phase 2 (or
-- promising=true rows that haven't been graded yet because of the
-- per-target daily cap) work as "pending" — UI sorts them to the
-- bottom of the list.

alter table public.scores
  add column if not exists axis_scores jsonb,
  add column if not exists fit_reasoning text;

comment on column public.scores.axis_scores is
  'Phase 2 LLM grader output: {title_fit, skills_fit, seniority_fit, '
  'domain_fit} each 0-100. NULL when Phase 2 has not run for this row '
  '(legacy / pending / Phase 2 failed).';

comment on column public.scores.fit_reasoning is
  'Phase 2 LLM grader output: 1-2 sentence reasoning. Surfaced on the '
  'job detail panel. NULL when Phase 2 has not run.';
