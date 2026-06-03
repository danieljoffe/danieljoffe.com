-- Slim target shape (PR A of plan-wyrdfold-streamlined-target.md).
--
-- Phase 2 (Sonnet job-fit grading) doesn't actually consume the legacy
-- ``scoring_profile.categories`` keyword weights or
-- ``scoring_profile.seniority.signals`` lists — it just dumps them into
-- the prompt as context. A richer prose ``description`` (already on the
-- table) plus a canonical ``seniority_hint`` enum + ``domain_hints`` list
-- carries strictly more signal and matches the four-axis Phase 2 scorecard
-- vocabulary 1:1.
--
-- This migration is additive only. Legacy targets keep their full
-- ``scoring_profile`` and their NULL slim fields; reads of either shape
-- keep working. New targets created after this PR ships populate both
-- shapes (the derive endpoint extends to emit slim fields alongside the
-- keyword profile). PR B backfills slim fields onto legacy rows; PR C
-- drops the keyword scaffolding once nothing reads it.
--
-- See plan-wyrdfold-streamlined-target.md for the full architecture +
-- rollout plan.

alter table public.targets
  add column if not exists seniority_hint text,
  add column if not exists domain_hints text[] default '{}'::text[];

comment on column public.targets.seniority_hint is
  'Single canonical seniority level for the slim target shape: one of '
  'ic, senior, staff, manager, director, vp, c_level. NULL on legacy '
  'targets (will be backfilled in PR B). Replaces the freeform '
  'scoring_profile.seniority.signals list as the source of truth for '
  'Phase 2 seniority_fit calibration.';

comment on column public.targets.domain_hints is
  'Industries / verticals / product types relevant to this target '
  '(e.g. [''SaaS'', ''DTC'', ''fintech'']). Replaces '
  'scoring_profile.domain.signals; empty array means domain-agnostic. '
  'Used by Phase 2''s domain_fit axis.';

-- No CHECK constraint on seniority_hint at the DB level — keeps it
-- forward-compatible if we add a new tier (e.g. ''lead'') without a
-- schema migration. The Pydantic model enforces the enum on writes.
