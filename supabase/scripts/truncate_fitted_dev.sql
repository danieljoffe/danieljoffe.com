-- ============================================
-- ONE-OFF: Truncate all Fitted tables in the DEV database.
-- ============================================
--
-- Wipes rows only. Schema, indexes, RLS, and triggers are preserved.
-- Audit-tool tables (scans, scan_issues, leads, email_log, insights views)
-- are NOT touched.
--
-- Run via Supabase Studio SQL editor against the DEV project, or:
--   psql "$SUPABASE_DEV_DB_URL" -f supabase/scripts/truncate_fitted_dev.sql
--
-- DO NOT add this file to supabase/migrations/. It is a destructive one-off,
-- not a schema change.

DO $$
DECLARE
  t TEXT;
  fitted_tables TEXT[] := ARRAY[
    -- Resume + tailoring
    'tailored_resume_versions',
    'tailored_resumes',
    'resume_uploads',
    'batch_jobs',
    -- Targets + scoring
    'job_target_scores',
    'job_analyses',
    'user_targets',
    'target_reference_jds',
    'job_targets',
    -- Job pipeline
    'job_status_log',
    'job_notification_sent',
    'job_postings',
    'job_sources',
    -- Experience / onboarding
    'experience_chunks',
    'experience_conversation_turns',
    'experience_optimized_docs',
    'experience_prose_docs',
    'experience_preferences',
    -- Cost + profile
    'llm_cost_log',
    'user_profiles'
  ];
  truncated INT := 0;
  skipped   INT := 0;
BEGIN
  FOREACH t IN ARRAY fitted_tables LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE format('TRUNCATE TABLE %I RESTART IDENTITY CASCADE', t);
      RAISE NOTICE 'Truncated %', t;
      truncated := truncated + 1;
    ELSE
      RAISE NOTICE 'Skipped (table not found): %', t;
      skipped := skipped + 1;
    END IF;
  END LOOP;

  RAISE NOTICE '---';
  RAISE NOTICE 'Done. % truncated, % skipped.', truncated, skipped;
END $$;
