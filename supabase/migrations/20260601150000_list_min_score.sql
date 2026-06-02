-- Decouple the jobs-list filter from the email-notification threshold.
--
-- ``user_profiles.job_score_threshold`` has historically gated email
-- alerts only — but the email/SMS settings UI is disabled until SMTP +
-- Twilio are configured, so users have no way to change the value. PR
-- #776 mistakenly auto-applied ``job_score_threshold`` as the default
-- ``min_score`` on ``GET /jobs``, locking senior-tier users into an
-- empty list view until they manually set a chip every time.
--
-- New ``list_min_score`` is a separate, user-controlled score floor for
-- the jobs list. NULL means "no auto-filter" (status-quo behaviour
-- before #776); any positive integer applies as the default
-- ``min_score`` when the caller doesn't pass one. The settings UI
-- exposes this knob even while the email/SMS sections stay disabled.

alter table public.user_profiles
  add column if not exists list_min_score integer
  check (list_min_score is null or (list_min_score >= 0 and list_min_score <= 100));
