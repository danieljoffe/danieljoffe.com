-- Wrap auth.jwt() in a scalar subquery on the job_feedback and
-- target_learning_log RLS policies so Postgres evaluates it once per
-- query instead of once per row.
--
-- The original policies (migrations 20260601130000_job_feedback.sql and
-- 20260601140000_target_learning_log.sql) used the unwrapped form:
--
--     using (auth.jwt() ->> 'sub' = user_id)
--
-- which the planner treats as a STABLE function call referenced in a
-- per-row filter — re-evaluating the JWT lookup for every row scanned.
-- Wrapping in `(SELECT …)` lets the planner pull it out of the scan as
-- a scalar InitPlan, evaluated exactly once. Same semantics, dramatic
-- perf win at scale. This is the Supabase-documented pattern for any
-- `auth.*()` call inside a policy.
--
-- DROP + CREATE per policy is forward-only safe: Postgres replaces the
-- policy atomically in the same transaction, no window where the table
-- is unprotected.

-- ----- job_feedback ---------------------------------------------------------

drop policy if exists "job_feedback_self_select" on public.job_feedback;
create policy "job_feedback_self_select"
  on public.job_feedback for select
  using ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "job_feedback_self_insert" on public.job_feedback;
create policy "job_feedback_self_insert"
  on public.job_feedback for insert
  with check ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "job_feedback_self_update" on public.job_feedback;
create policy "job_feedback_self_update"
  on public.job_feedback for update
  using ((select auth.jwt() ->> 'sub') = user_id);

drop policy if exists "job_feedback_self_delete" on public.job_feedback;
create policy "job_feedback_self_delete"
  on public.job_feedback for delete
  using ((select auth.jwt() ->> 'sub') = user_id);

-- ----- target_learning_log --------------------------------------------------

drop policy if exists "target_learning_log_self_select" on public.target_learning_log;
create policy "target_learning_log_self_select"
  on public.target_learning_log for select
  using ((select auth.jwt() ->> 'sub') = user_id);
