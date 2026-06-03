-- User-tunable Phase 2 axis weights (PR E of plan-wyrdfold-streamlined-target.md).
--
-- Phase 2 emits a four-axis scorecard (title_fit / skills_fit /
-- seniority_fit / domain_fit) per (job, target) and a holistic overall
-- ``score``. This migration lets each user-target pairing carry custom
-- weights over those axes, so a user can say "I care more about exact
-- title match than domain" without changing the Phase 2 prompt or
-- re-grading any rows.
--
-- The display_score the /jobs router returns becomes:
--
--    display_score = sum(axes[a] * weights[a] for a) / sum(weights)
--
-- when weights are set. When NULL, the router returns the existing
-- ``scores.score`` unchanged — so this migration ships behaviorally
-- neutral (no user sees a change until they explicitly adjust weights).
--
-- ``axis_weights_previous`` snapshots the prior value on every save so
-- the UI's "undo last change" button can revert in one click without
-- a full history table. Only the most recent previous state is kept
-- — full history is YAGNI for the v1 capability.
--
-- See plan-wyrdfold-streamlined-target.md "User-tunable axis weights
-- (PR E)" for the full design including safety UX (pre-change preview,
-- undo, settings-buried placement) and the three-feedback-loop
-- architecture (example pools / weight suggestions / per-target prompt
-- iteration).

alter table public.user_targets
  add column if not exists axis_weights jsonb,
  add column if not exists axis_weights_previous jsonb;

comment on column public.user_targets.axis_weights is
  'User-tunable weights applied to Phase 2 axis_scores at read time to '
  'produce display_score. JSONB shape: {"title_fit": 0.25, "skills_fit": '
  '0.25, "seniority_fit": 0.25, "domain_fit": 0.25}. NULL means "use '
  'equal quartile" (Sonnet''s holistic score). Adjusting weights does '
  'NOT trigger re-grading; behavior is purely read-time math.';

comment on column public.user_targets.axis_weights_previous is
  'One-step-back snapshot for the undo button. Set automatically every '
  'time axis_weights changes (the prior value moves here). Only one '
  'previous state is retained — YAGNI on full history for v1.';

-- No CHECK constraint on the JSON shape because Postgres can't validate
-- nested JSONB cheaply. The API layer (Pydantic AxisWeights model)
-- enforces: keys are the 4 axes, values are floats in [0, 1].
