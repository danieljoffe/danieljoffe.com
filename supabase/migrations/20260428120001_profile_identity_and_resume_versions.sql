-- ============================================
-- MIGRATION: Profile identity fields + resume version history
-- Phase 3 audit (F3-A, F3-K, F3-H).
--
-- F3-A / F3-K: batch resume + cover-letter endpoints required ContactInfo.name
--   but the frontend had nowhere to capture it and sent contact:{}, so every
--   end-to-end request 422'd. Add identity columns to user_profiles so the
--   backend can resolve contact server-side from a single source of truth.
--
-- F3-H: tailored_resumes.payload was overwritten on every PATCH with no audit
--   trail. Add a versions table; service caps history at 5 most recent (paid
--   tiers can lift the cap later).
-- ============================================

-- ---- F3-A: identity fields on user_profiles --------------------------------
-- email + phone_number already exist (added by 20260426120000). Add the four
-- remaining ContactInfo fields.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT;

-- ---- F3-H: resume version history ------------------------------------------
CREATE TABLE IF NOT EXISTS tailored_resume_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id    UUID NOT NULL REFERENCES tailored_resumes(id) ON DELETE CASCADE,
  payload      JSONB NOT NULL,
  source       TEXT NOT NULL CHECK (source IN ('initial', 'user_edit', 'llm_adapt')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tailored_resume_versions_resume_created
  ON tailored_resume_versions(resume_id, created_at DESC);

ALTER TABLE tailored_resume_versions ENABLE ROW LEVEL SECURITY;
