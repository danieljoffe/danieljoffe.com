-- Idle-account lifecycle columns (idle defer / auto-deactivate work).
--
-- last_seen_at backfills now() so existing users don't mass-deactivate
-- the day this ships — the clock starts at deploy time.

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

UPDATE public.user_profiles
  SET last_seen_at = now()
  WHERE last_seen_at IS NULL;

COMMENT ON COLUMN public.user_profiles.last_seen_at IS
  'Last authenticated request (throttled ~1/hour). Drives idle defer/deactivate.';

ALTER TABLE public.user_targets
  ADD COLUMN IF NOT EXISTS auto_deactivated_at timestamptz;

COMMENT ON COLUMN public.user_targets.auto_deactivated_at IS
  'Set when the idle-lifecycle sweep deactivated this link (NULL = user action).';

ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS consecutive_failures integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.sources.consecutive_failures IS
  'Fetch failures since last success; the poller auto-disables at threshold.';
