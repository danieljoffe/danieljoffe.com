-- Adaptive source cadence: track when a source last produced an
-- ingestible candidate (a non-empty upsert batch in the poller).
--
-- NULL means "never stamped" — rows predating this migration stay NULL
-- until their next productive poll, and the lifecycle sweep leaves NULL
-- rows untouched so the backfill happens organically instead of
-- mass-stretching every source on deploy day.

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS last_candidate_at timestamptz;

COMMENT ON COLUMN public.sources.last_candidate_at IS
  'Last poll that upserted at least one candidate job. Drives the adaptive cadence sweep (cold sources stretch to daily polling).';
