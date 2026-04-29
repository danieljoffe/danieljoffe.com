-- ============================================
-- MIGRATION: Notification tables (consolidating)
-- Phase 5 audit (F5-B).
-- ============================================
--
-- Background: the original `20260424120000_create_job_notification_tables.sql`
-- (#510) was deleted in revert `c0b105a1` and never restored. Subsequent
-- migrations (`add_sms_notification_columns` 20260426120000,
-- `profile_identity_and_resume_versions` 20260428120001) ALTER the missing
-- tables. Result:
--   - PROD: tables don't exist at all (only `job_postings`).
--   - DEV: tables exist in a partially-rolled-back state (SMS columns missing,
--     `resend_id` not renamed, `channel` discriminator absent), while the
--     SMS migration is recorded as applied in `schema_migrations`.
--
-- This migration is idempotent against both states:
--   - Empty DB  → CREATE TABLE IF NOT EXISTS builds final shape.
--   - Drifted DB → ADD COLUMN IF NOT EXISTS + conditional rename heal it.

-- ---- user_profiles ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_profiles (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                     UUID UNIQUE,
  email                       TEXT NOT NULL UNIQUE,
  -- Identity (F3-A)
  name                        TEXT,
  location                    TEXT,
  linkedin_url                TEXT,
  website_url                 TEXT,
  -- Email notification prefs (#510)
  job_score_threshold         INTEGER NOT NULL DEFAULT 70
                              CHECK (job_score_threshold BETWEEN 0 AND 100),
  job_notifications_enabled   BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at             TIMESTAMPTZ,
  -- SMS notification prefs (#511)
  phone_number                TEXT,
  sms_notifications_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
  sms_score_threshold         INTEGER NOT NULL DEFAULT 85
                              CHECK (sms_score_threshold BETWEEN 0 AND 100),
  sms_daily_limit             INTEGER NOT NULL DEFAULT 5
                              CHECK (sms_daily_limit BETWEEN 1 AND 50),
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Heal DEV drift: add any columns missing on an existing user_profiles table.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS name                       TEXT,
  ADD COLUMN IF NOT EXISTS location                   TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url               TEXT,
  ADD COLUMN IF NOT EXISTS website_url                TEXT,
  ADD COLUMN IF NOT EXISTS phone_number               TEXT,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_score_threshold        INTEGER NOT NULL DEFAULT 85,
  ADD COLUMN IF NOT EXISTS sms_daily_limit            INTEGER NOT NULL DEFAULT 5;

-- Re-add CHECK constraints only if they don't already exist (CREATE TABLE
-- already added them on a fresh DB; ADD COLUMN IF NOT EXISTS doesn't carry
-- the CHECK on existing tables).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_sms_score_threshold_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_sms_score_threshold_check
      CHECK (sms_score_threshold BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_sms_daily_limit_check'
      AND conrelid = 'public.user_profiles'::regclass
  ) THEN
    ALTER TABLE user_profiles
      ADD CONSTRAINT user_profiles_sms_daily_limit_check
      CHECK (sms_daily_limit BETWEEN 1 AND 50);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_notifications
  ON user_profiles(job_notifications_enabled)
  WHERE job_notifications_enabled = TRUE AND unsubscribed_at IS NULL;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_profiles_updated_at();

-- ---- job_notification_sent -------------------------------------------------
CREATE TABLE IF NOT EXISTS job_notification_sent (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_posting_id   UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  score_at_send    INTEGER NOT NULL CHECK (score_at_send BETWEEN 0 AND 100),
  external_id      TEXT,
  channel          TEXT NOT NULL DEFAULT 'email'
                   CHECK (channel IN ('email', 'sms')),
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_profile_id, job_posting_id, channel)
);

-- Heal DEV drift: rename resend_id → external_id (if needed), add channel.
DO $$
BEGIN
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
    ALTER TABLE job_notification_sent RENAME COLUMN resend_id TO external_id;
  END IF;
END$$;

ALTER TABLE job_notification_sent
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS channel     TEXT NOT NULL DEFAULT 'email';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_notification_sent_channel_check'
      AND conrelid = 'public.job_notification_sent'::regclass
  ) THEN
    ALTER TABLE job_notification_sent
      ADD CONSTRAINT job_notification_sent_channel_check
      CHECK (channel IN ('email', 'sms'));
  END IF;
END$$;

-- Swap unique constraint to include channel (so email + sms for the same
-- (profile, job) don't collide).
ALTER TABLE job_notification_sent
  DROP CONSTRAINT IF EXISTS job_notification_sent_user_profile_id_job_posting_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'job_notification_sent_user_profile_job_channel_key'
      AND conrelid = 'public.job_notification_sent'::regclass
  ) THEN
    ALTER TABLE job_notification_sent
      ADD CONSTRAINT job_notification_sent_user_profile_job_channel_key
      UNIQUE (user_profile_id, job_posting_id, channel);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_job_notification_sent_user
  ON job_notification_sent(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_notification_sent_job
  ON job_notification_sent(job_posting_id);

ALTER TABLE job_notification_sent ENABLE ROW LEVEL SECURITY;

-- No public RLS policies: everything goes through service_role.
