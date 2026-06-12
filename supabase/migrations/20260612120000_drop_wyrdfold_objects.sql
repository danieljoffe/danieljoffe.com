-- ============================================================================
-- DROP wyrdfold objects from the (formerly shared) Supabase project
-- ============================================================================
--
-- !!! DO NOT APPLY YET !!!
-- This is authored ahead of time but must NOT run until the wyrdfold deploy
-- cutover is complete and verified in production (wyrdfold now lives in its own
-- repo + its own Supabase project). Running it removes wyrdfold's data from the
-- old shared project, which still serves live wyrdfold until cutover.
-- Gate: only `supabase db push` this after prod is confirmed on the new project.
--
-- Scope: drops every wyrdfold table/function/role. KEEPS the audit-tool +
-- portfolio objects that remain in this project:
--   tables    : scans, scan_issues, leads, email_log
--   views     : insights_domains_view, insights_summary_view, insights_violations_view
--   functions : insights_score_stats, insights_trends
--
-- Prereqs before applying:
--   1. Un-register the `before_user_created` auth hook
--      (`hook_restrict_wyrdfold_beta`) in this project's Auth settings, else the
--      auth service references a dropped function.
--   2. If wyrdfold used a Supabase Storage bucket for resume uploads, delete the
--      bucket + objects separately (not covered here — this is public-schema only).
-- ============================================================================

-- --- Tables (current names, post wyrdfold_rename_pass). CASCADE removes their
-- --- RLS policies, triggers, FKs, sequences, and any dependent views. ---
DROP TABLE IF EXISTS public.scores CASCADE;
DROP TABLE IF EXISTS public.analyses CASCADE;
DROP TABLE IF EXISTS public.notifications_sent CASCADE;
DROP TABLE IF EXISTS public.status_log CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.reference_jds CASCADE;
DROP TABLE IF EXISTS public.targets CASCADE;
DROP TABLE IF EXISTS public.user_targets CASCADE;
DROP TABLE IF EXISTS public.sources CASCADE;
DROP TABLE IF EXISTS public.source_discoveries CASCADE;
DROP TABLE IF EXISTS public.target_derive_jd_cache CASCADE;
DROP TABLE IF EXISTS public.target_learning_log CASCADE;
DROP TABLE IF EXISTS public.job_feedback CASCADE;
DROP TABLE IF EXISTS public.document_versions CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.uploaded_resumes CASCADE;
DROP TABLE IF EXISTS public.experience_chunks CASCADE;
DROP TABLE IF EXISTS public.experience_conversation_turns CASCADE;
DROP TABLE IF EXISTS public.experience_optimized_docs CASCADE;
DROP TABLE IF EXISTS public.experience_prose_docs CASCADE;
DROP TABLE IF EXISTS public.experience_preferences CASCADE;
DROP TABLE IF EXISTS public.batch_runs CASCADE;
DROP TABLE IF EXISTS public.llm_costs CASCADE;
DROP TABLE IF EXISTS public.wyrdfold_beta_invites CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- --- Functions (RPCs + trigger fns not removed by table CASCADE). Overload-safe:
-- --- drop every signature of each name. ---
DO $$
DECLARE
  stmt text;
BEGIN
  FOR stmt IN
    SELECT format(
      'DROP FUNCTION IF EXISTS public.%I(%s) CASCADE;',
      p.proname,
      pg_get_function_identity_arguments(p.oid)
    )
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_target_jobs',
        'match_target_by_label',
        'bulk_update_job_salaries',
        'bulk_update_job_scores',
        'bulk_update_recency_scores',
        'bulk_update_salaries',
        'bulk_update_scores',
        'hook_restrict_wyrdfold_beta',
        'insert_source_if_not_exists',
        'set_job_feedback_updated_at',
        'set_target_learning_log_updated_at',
        'set_user_profiles_updated_at',
        'spend_by_purpose_since',
        'sync_target_active',
        'total_spend_since'
      )
  LOOP
    EXECUTE stmt;
  END LOOP;
END $$;

-- --- Role: tools_admin (renamed from the old system_user; used by wyrdfold RLS
-- --- and the cron/poller). Reassign/strip ownership before dropping. ---
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'tools_admin') THEN
    REASSIGN OWNED BY tools_admin TO postgres;
    DROP OWNED BY tools_admin;
    DROP ROLE tools_admin;
  END IF;
END $$;
