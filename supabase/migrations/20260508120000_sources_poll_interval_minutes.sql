-- Per-source polling cadence for the scheduled poller.
--
-- The cron-driven poller (`poll_due_sources`) ticks frequently (e.g.
-- every 30 min) but only re-fetches a given source once per its
-- configured interval. Keeps the API gentle on Greenhouse/Lever/etc.
-- while still surfacing new jobs without manual triggers, and lets us
-- raise the interval for expensive crawl-based sources (Firecrawl).
--
-- Default 240 minutes (4 hours) matches the audit-tier cadence for
-- most ATS APIs. Bound is wide-open (5 min .. 1 week) so operators
-- can dial individual rows up or down without another migration.

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS poll_interval_minutes integer NOT NULL DEFAULT 240;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'sources_poll_interval_minutes_check'
      AND conrelid = 'public.sources'::regclass
  ) THEN
    ALTER TABLE public.sources
      ADD CONSTRAINT sources_poll_interval_minutes_check
      CHECK (poll_interval_minutes BETWEEN 5 AND 10080);
  END IF;
END
$$;

COMMENT ON COLUMN public.sources.poll_interval_minutes IS
  'Minimum minutes between polls of this source. Used by poll_due_sources.';

-- Composite index supports the "find sources due to be polled" query:
--   SELECT * FROM sources WHERE enabled AND
--   (last_polled_at IS NULL OR last_polled_at + interval ... <= now())
-- The filter is applied client-side (per-row interval makes a pure-SQL
-- predicate awkward), but indexing on (enabled, last_polled_at) lets
-- the initial fetch skip disabled rows efficiently.
CREATE INDEX IF NOT EXISTS idx_sources_enabled_last_polled
  ON public.sources(enabled, last_polled_at);
