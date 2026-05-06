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

-- SMS fields on user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS sms_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sms_score_threshold INTEGER NOT NULL DEFAULT 85
    CHECK (sms_score_threshold BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS sms_daily_limit INTEGER NOT NULL DEFAULT 5
    CHECK (sms_daily_limit BETWEEN 1 AND 50);

-- Rename resend_id to generic external_id
ALTER TABLE job_notification_sent
  RENAME COLUMN resend_id TO external_id;

-- Channel discriminator (email or sms)
ALTER TABLE job_notification_sent
  ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'email'
    CHECK (channel IN ('email', 'sms'));

-- Update unique constraint to include channel
ALTER TABLE job_notification_sent
  DROP CONSTRAINT IF EXISTS job_notification_sent_user_profile_id_job_posting_id_key;
ALTER TABLE job_notification_sent
  ADD CONSTRAINT job_notification_sent_user_profile_job_channel_key
    UNIQUE (user_profile_id, job_posting_id, channel);
