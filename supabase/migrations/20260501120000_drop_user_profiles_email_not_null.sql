-- ============================================
-- MIGRATION: Drop NOT NULL on user_profiles.email
--
-- Email started life as the alert recipient (notifications #510), so it was
-- declared NOT NULL UNIQUE. With the F3-A identity work, email became one of
-- several user-fillable contact fields (alongside name/phone/location/etc.,
-- which were always nullable). The FastAPI auto-creates a profile row on
-- first GET to /profile/notifications and /profile/identity by inserting an
-- empty {}, which now 23502s because email has no value to satisfy the
-- constraint.
--
-- The UNIQUE index stays — Postgres treats NULLs as distinct, so multiple
-- profiles can have NULL email without conflict, and the uniqueness still
-- prevents two profiles claiming the same address.
-- ============================================

ALTER TABLE user_profiles
  ALTER COLUMN email DROP NOT NULL;

-- Seed the single-user row if the table is empty. The FastAPI auto-create
-- fires from two endpoints in parallel on first load (notifications +
-- identity), so without a pre-existing row both inserts race and you end
-- up with two profiles. Idempotent: subsequent runs short-circuit on the
-- NOT EXISTS check.
INSERT INTO user_profiles (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM user_profiles);
