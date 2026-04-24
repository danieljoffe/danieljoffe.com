-- ============================================
-- MIGRATION: Job alert notification preferences + dedup log
-- ============================================
--
-- Supports issue #510 (feat(fitted): email notifications — Resend, threshold-based).
--
-- Tenancy hedge: user_profiles.user_id is NULLABLE so the first profile row
-- (single-user v1) works without Supabase Auth attached. When #494's magic
-- link flow binds sessions to auth.users, this column fills in — no schema
-- change needed beyond a future NOT NULL tightening.

-- Table: user_profiles
-- Fitted account preferences (notification settings, eventually more).
CREATE TABLE IF NOT EXISTS user_profiles (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    UUID UNIQUE,
  email                      TEXT NOT NULL UNIQUE,
  job_score_threshold        INTEGER NOT NULL DEFAULT 70
                             CHECK (job_score_threshold BETWEEN 0 AND 100),
  job_notifications_enabled  BOOLEAN NOT NULL DEFAULT TRUE,
  unsubscribed_at            TIMESTAMPTZ,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_notifications
  ON user_profiles(job_notifications_enabled)
  WHERE job_notifications_enabled = TRUE AND unsubscribed_at IS NULL;

-- Table: job_notification_sent
-- Dedup log — one row per (profile, posting) means "alert has been attempted".
-- The poller inserts a row *before* sending; if the send succeeds, resend_id
-- is patched in. A row without a resend_id is still treated as sent (at-most-once).
CREATE TABLE IF NOT EXISTS job_notification_sent (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  job_posting_id   UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  score_at_send    INTEGER NOT NULL CHECK (score_at_send BETWEEN 0 AND 100),
  resend_id        TEXT,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_profile_id, job_posting_id)
);

CREATE INDEX IF NOT EXISTS idx_job_notification_sent_user
  ON job_notification_sent(user_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_notification_sent_job
  ON job_notification_sent(job_posting_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notification_sent ENABLE ROW LEVEL SECURITY;

-- No public policies: everything goes through service_role.

-- Keep updated_at current on user_profiles edits.
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
