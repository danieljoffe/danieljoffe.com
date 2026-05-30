-- ``source_discoveries`` audit table. Logs every company the automated
-- discovery loop found, whether it became a new ``sources`` row, and which
-- search query / target attributed the discovery. Used to:
--   * track quota usage against the Brave Search API budget
--   * debug "why didn't we find company X" (was the keyword wrong, the URL
--     not classifiable, or were we deduping against an existing row?)
--   * compute per-target discovery yield for the cadence backoff logic
--     (targets that yield zero new sources for N runs back off to weekly)
--
-- Append-only — never updated, never deleted. Cheap to query because we
-- index by ``discovered_at`` and ``target_id``.

CREATE TABLE IF NOT EXISTS public.source_discoveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which target's keywords drove this discovery. NULL means the discovery
  -- run was operator-triggered without a specific target (e.g. backfill).
  target_id uuid NULL REFERENCES public.targets(id) ON DELETE SET NULL,
  -- The keyword string the search was issued for. Useful for "which of the
  -- target's derived keywords is actually surfacing companies".
  search_keyword text NOT NULL,
  -- The ATS-restricted host filter the search was scoped to (e.g.
  -- ``boards.greenhouse.io``, ``jobs.lever.co``, ``*.myworkdayjobs.com``).
  -- Null when the search was site-agnostic.
  ats_site_filter text NULL,
  -- The URL Brave returned that we then ran through ``detect_ats``.
  source_url text NOT NULL,
  -- What ``detect_ats`` produced. NULL if it couldn't classify the URL.
  detected_provider text NULL,
  detected_board_token text NULL,
  detected_company_name text NULL,
  detected_job_count int NULL,
  -- Outcome of the upsert into ``sources``. Possible values:
  --   ``inserted``      — new sources row was added, polling will pick it up
  --   ``duplicate``     — board_token already in ``sources`` (deduped)
  --   ``unclassified``  — detect_ats returned NULL, no row written
  --   ``filtered``      — classified but rejected (e.g. job_count = 0)
  outcome text NOT NULL,
  discovered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS source_discoveries_target_id_idx
  ON public.source_discoveries (target_id);
CREATE INDEX IF NOT EXISTS source_discoveries_discovered_at_idx
  ON public.source_discoveries (discovered_at DESC);
-- Quick "did we already see this URL today?" check during a run, so a
-- mid-run crash + restart doesn't re-classify the same URL twice.
CREATE INDEX IF NOT EXISTS source_discoveries_source_url_idx
  ON public.source_discoveries (source_url);

-- RLS — service-role only. Discoveries are operator-facing audit data;
-- regular JWT callers never need to read them. The poller/discovery loop
-- writes via service_role which bypasses RLS, so we enable RLS without
-- any policies (effectively closing the table to JWT/anon).
ALTER TABLE public.source_discoveries ENABLE ROW LEVEL SECURITY;
