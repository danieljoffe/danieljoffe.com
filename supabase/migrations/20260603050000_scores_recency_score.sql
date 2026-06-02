-- Recency-decayed sort score (Phase 5 of the LLM scoring migration).
--
-- The fit signal (``scores.score``) answers "how well does this job
-- match the target?". It says nothing about whether the posting is
-- still worth surfacing — a 90-fit role that's been open for two months
-- is usually gone. ``recency_score`` is the value the /jobs list sorts
-- and paginates by: the fit score multiplied by an age decay so stale
-- postings drift down the list without being archived.
--
--   recency_score = round(score * max(0.3, 1 - max(0, age_days - 7) * 0.015))
--
-- - 7-day grace window at full score.
-- - Loses 1.5% of the multiplier per day after the grace window.
-- - Floors at 30% of the fit score around ~54 days old.
--
-- See ``app/services/recency.py`` for the canonical helper. The decay
-- is computed and STORED (Daniel's call) rather than applied at read
-- time, so the list can sort + paginate by it server-side without a
-- full-table scan. The poller refreshes the column every cycle from
-- the job's ``first_seen_at`` (see ``refresh_recency_scores``).
--
-- Feature flag: ``RECENCY_DECAY_ENABLED`` (default off). When off the
-- multiplier is 1.0, so ``recency_score == score`` and list ordering is
-- unchanged. The column is always populated (never NULL for new rows)
-- so flipping the flag on is a pure sort change — no backfill gap.

alter table public.scores
  add column if not exists recency_score integer;

comment on column public.scores.recency_score is
  'Fit score (scores.score) decayed by posting age — the value the '
  '/jobs list sorts/paginates by. recency_score == score when '
  'RECENCY_DECAY_ENABLED is off. Refreshed by the poller each cycle '
  'from jobs.first_seen_at. See app/services/recency.py.';

-- Backfill existing rows so the column is never NULL when the flag
-- flips on (NULLS would sort last and hide live jobs until re-polled).
-- Fresh value == score; the poller applies real decay on next cycle.
update public.scores
  set recency_score = score
  where recency_score is null;

-- Index the list's default sort key. ``score`` already had no dedicated
-- index for this; recency_score replaces it as the ORDER BY column when
-- decay is on, so give it the (target_id, recency_score DESC) shape the
-- two-query list path and the get_target_jobs RPC both page against.
create index if not exists scores_target_recency_idx
  on public.scores (target_id, recency_score desc);

-- Bulk-write helper so the poller can refresh many rows' recency_score
-- in a single round-trip (mirrors ``bulk_update_scores``, which writes
-- jobs.score). Each element is ``{"id": <scores.id>, "recency_score":
-- <int>}``. recency_score is per-row (depends on that row's fit score),
-- so we can't collapse it to one UPDATE value — this keeps it to one
-- statement instead of one round-trip per row.
create or replace function public.bulk_update_recency_scores(p_updates jsonb)
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  cnt integer;
begin
  if p_updates is null or jsonb_array_length(p_updates) = 0 then
    return 0;
  end if;

  with u as (
    select (elem->>'id')::uuid            as id,
           (elem->>'recency_score')::int  as recency_score
    from   jsonb_array_elements(p_updates) elem
  )
  update public.scores s
  set    recency_score = u.recency_score
  from   u
  where  s.id = u.id;

  get diagnostics cnt = row_count;
  return cnt;
end;
$$;
