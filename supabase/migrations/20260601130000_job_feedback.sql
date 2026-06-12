-- Per-(user, target) feedback signals on job postings.
--
-- A row records "I marked this job irrelevant / relevant for this target's
-- lens, with an optional reason". The relevance-feedback learner (deterministic
-- v1, LLM v2) reads unapplied rows and mutates the target's scoring_profile
-- to suppress patterns the user has flagged 3+ times.
--
-- target_id is mandatory because feedback is about the lens, not the job in
-- the abstract — a posting marked irrelevant under "Senior FE" can still be
-- relevant under "Eng Manager". applied_at + applied_run_id let the learner
-- mark consumed rows and group the batch that produced one profile mutation
-- (so target_learning_log in v2 can roll a single run back).
--
-- The unique (user_id, job_posting_id, target_id) means latest wins on
-- conflict: clicking "irrelevant" then "relevant" overwrites the prior signal
-- rather than appending. This matches the UI's Undo-via-toast pattern.
--
-- Forward-only and idempotent.

create table if not exists public.job_feedback (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null,
  job_posting_id  uuid not null references public.jobs(id) on delete cascade,
  target_id       uuid not null references public.targets(id) on delete cascade,
  signal          text not null check (signal in ('irrelevant', 'relevant')),
  reason          text,
  applied_at      timestamptz,
  applied_run_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, job_posting_id, target_id)
);

-- The learner's hottest query: "give me every unapplied row for this target
-- so I can derive a patch". Partial index keeps it tiny since applied rows
-- dominate at steady state.
create index if not exists idx_job_feedback_target_unapplied
  on public.job_feedback (target_id)
  where applied_at is null;

-- The list endpoint reads rows for one user's target. Composite index lets
-- the GET /targets/{id}/feedback endpoint paginate without a full scan.
create index if not exists idx_job_feedback_user_target_created
  on public.job_feedback (user_id, target_id, created_at desc);

alter table public.job_feedback enable row level security;

-- A user can only read / write / delete their own feedback rows.
-- Service-role bypass (PostgREST + service_role JWT) lets the API server
-- + the learner CRUD without per-user impersonation.
create policy "job_feedback_self_select"
  on public.job_feedback for select
  using (auth.jwt() ->> 'sub' = user_id);

create policy "job_feedback_self_insert"
  on public.job_feedback for insert
  with check (auth.jwt() ->> 'sub' = user_id);

create policy "job_feedback_self_update"
  on public.job_feedback for update
  using (auth.jwt() ->> 'sub' = user_id);

create policy "job_feedback_self_delete"
  on public.job_feedback for delete
  using (auth.jwt() ->> 'sub' = user_id);

-- updated_at trigger so the unique-key upsert path (RPC-style updates)
-- keeps a fresh timestamp without callers having to remember.
create or replace function public.set_job_feedback_updated_at()
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

drop trigger if exists trg_job_feedback_updated_at on public.job_feedback;
create trigger trg_job_feedback_updated_at
  before update on public.job_feedback
  for each row
  execute function public.set_job_feedback_updated_at();
