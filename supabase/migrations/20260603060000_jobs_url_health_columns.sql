-- Job URL health tracking — for the periodic "is this job still live?" check.
--
-- The poller already archives jobs that disappear from a source's listings
-- (via the all_external_ids diff in poller._poll_one_source). That catches
-- the common case where Greenhouse / Lever drops a posting from the public
-- feed. It does NOT catch the link-rot case where:
--   - the source still lists the job, but the absolute_url 404s
--   - the job redirects to a "no longer available" landing page
--   - the company's careers domain itself moves and old URLs break
--
-- These columns let the new ``url_health`` service track per-job HTTP status
-- across periodic checks (default every 24h, see URL_HEALTH_TICK_HOURS). On
-- N consecutive failures the job gets archived and its heavy fields
-- (description_html on jobs + axis_scores/fit_reasoning/score_breakdown on
-- scores) are NULL'd to reclaim DB space.
--
-- See ``app/services/url_health.py`` for the runtime; gated behind
-- URL_HEALTH_CHECK_ENABLED so the migration is safe to land without
-- behaviour changes.

alter table public.jobs
  add column if not exists last_url_check_at timestamptz,
  add column if not exists url_check_status integer,
  add column if not exists url_check_failure_count integer not null default 0;

comment on column public.jobs.last_url_check_at is
  'Timestamp of the most recent URL health check. NULL for jobs ingested '
  'before url_health shipped, or never-checked. The scheduler picks the '
  'oldest first.';
comment on column public.jobs.url_check_status is
  'Most recent HTTP status code observed by the URL health check. NULL = '
  'never checked. 0 = network error / unreachable. 2xx = healthy. 4xx = '
  'dead-link signal (archived after url_check_failure_count >= threshold).';
comment on column public.jobs.url_check_failure_count is
  'Consecutive 4xx / network-error count. Reset to 0 on the next 2xx. '
  'Archives the job when it reaches URL_HEALTH_FAILURE_THRESHOLD (default '
  '3) to avoid a single transient failure killing a live posting.';

-- Partial index for the "needs check" query. Skip already-archived rows
-- (they won't be re-checked) and order by ``last_url_check_at`` ascending
-- (NULLs first) so the oldest checks run first. The WHERE clause keeps the
-- index narrow — only live jobs are candidates.
create index if not exists jobs_url_health_due_idx
  on public.jobs (last_url_check_at nulls first)
  where status not in ('archived', 'saved', 'applied');
