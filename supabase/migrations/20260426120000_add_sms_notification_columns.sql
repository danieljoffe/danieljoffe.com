-- ============================================
-- MIGRATION: SMS notification support
-- ============================================
--
-- Supports issue #511 (feat(fitted): SMS notifications — Twilio, deep link).
--
-- Extends user_profiles with phone + SMS preferences.
-- Adds channel discriminator to job_notification_sent so one job can
-- trigger both email and SMS without dedup conflict.
-- Renames resend_id → external_id (generic for Resend or Twilio SIDs).
--
-- ----------------------------------------------------------------------
-- HISTORICAL NOTE (Phase 5 fix):
-- This migration originally ran against a DB where `user_profiles` and
-- `job_notification_sent` already existed (created by an earlier path
-- that has since been consolidated into 20260428120002_create_notification_tables.sql).
-- On a fresh Supabase (e.g. branch previews), those tables don't exist
-- yet at this point in the timeline — the canonical create migration
-- runs two days later. ALTER TABLE on a non-existent relation hard
-- fails (SQLSTATE 42P01).
--
-- We guard every statement with `to_regclass(...) IS NOT NULL` so the
-- migration is a no-op on fresh DBs (the canonical migration produces
-- the same final schema) and stays a no-op on production (all changes
-- already applied; ADD COLUMN IF NOT EXISTS / RENAME guard the rest).
-- ----------------------------------------------------------------------

DO $$
BEGIN
  -- SMS fields on user_profiles
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS phone_number TEXT,
      ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sms_score_threshold INTEGER NOT NULL DEFAULT 85
        CHECK (sms_score_threshold BETWEEN 0 AND 100),
      ADD COLUMN IF NOT EXISTS sms_daily_limit INTEGER NOT NULL DEFAULT 5
        CHECK (sms_daily_limit BETWEEN 1 AND 50);
  END IF;

  IF to_regclass('public.job_notification_sent') IS NOT NULL THEN
    -- Rename resend_id to generic external_id (only if old name still present)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_notification_sent'
        AND column_name = 'resend_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'job_notification_sent'
        AND column_name = 'external_id'
    ) THEN
      ALTER TABLE job_notification_sent
        RENAME COLUMN resend_id TO external_id;
    END IF;

    -- Channel discriminator (email or sms)
    ALTER TABLE job_notification_sent
      ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
        CHECK (channel IN ('email', 'sms'));

    -- Update unique constraint to include channel
    ALTER TABLE job_notification_sent
      DROP CONSTRAINT IF EXISTS job_notification_sent_user_profile_id_job_posting_id_key;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'job_notification_sent_user_profile_job_channel_key'
        AND conrelid = 'public.job_notification_sent'::regclass
    ) THEN
      ALTER TABLE job_notification_sent
        ADD CONSTRAINT job_notification_sent_user_profile_job_channel_key
          UNIQUE (user_profile_id, job_posting_id, channel);
    END IF;
  END IF;
END
$$;
