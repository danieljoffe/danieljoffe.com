-- Audit + staging log for the LLM-driven feedback learner (Doc 2 v2).
--
-- Every invocation of ``run_llm_learner`` produces one row here regardless
-- of outcome: high-confidence patches are applied immediately (status='applied');
-- low-confidence patches (< CONFIDENCE_AUTO_APPLY) park as status='staged' for
-- a user to approve/reject from the settings UI. Either way the diff is
-- preserved so a one-click rollback is possible after-the-fact.
--
-- prev_profile / next_profile are full JSONB snapshots of the target's
-- scoring_profile before/after the patch. Storing the full snapshot (rather
-- than just the diff) trades a small storage cost for a much simpler
-- rollback: restore prev_profile + bump profile_version. The diff field
-- holds the structured ProfilePatch the LLM emitted (add_negative,
-- remove_negative, add_secondary, demote_keywords) so the settings UI
-- can render it without re-deriving from prev/next.
--
-- Forward-only and idempotent.

create table if not exists public.target_learning_log (
  id                uuid primary key default gen_random_uuid(),
  user_id           text not null,
  target_id         uuid not null references public.targets(id) on delete cascade,
  status            text not null check (status in ('applied', 'staged', 'rejected')),
  prev_profile      jsonb not null,
  next_profile      jsonb not null,
  diff              jsonb not null,
  confidence        numeric(3, 2) not null check (confidence >= 0 and confidence <= 1),
  rationale         text,
  signals_consumed  integer not null default 0,
  applied_run_id    uuid,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Settings page query: "show my staged patches for this target".
create index if not exists idx_target_learning_log_user_target_status
  on public.target_learning_log (user_id, target_id, status, created_at desc);

-- Group consumed feedback rows back to the run that ate them — used by
-- rollback ("which feedback signals fed this patch?") and by the v1
-- learner's own ``applied_run_id`` field on ``job_feedback`` rows so the
-- two systems share the same run identifier when the LLM step layers on
-- top of the deterministic pass.
create index if not exists idx_target_learning_log_applied_run
  on public.target_learning_log (applied_run_id)
  where applied_run_id is not null;

alter table public.target_learning_log enable row level security;

create policy "target_learning_log_self_select"
  on public.target_learning_log for select
  using (auth.jwt() ->> 'sub' = user_id);

-- Inserts + updates flow through the API server with the service-role
-- bypass, never a user JWT, so we only need a SELECT policy for the
-- settings page. Adding write policies would just be unused noise.

create or replace function public.set_target_learning_log_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_target_learning_log_updated_at on public.target_learning_log;
create trigger trg_target_learning_log_updated_at
  before update on public.target_learning_log
  for each row
  execute function public.set_target_learning_log_updated_at();
