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
--
-- ----------------------------------------------------------------------
-- HISTORICAL NOTE (Phase 5 fix): same pattern as 20260426120000 — this
-- migration ALTERs user_profiles before the canonical create migration
-- (20260428120002, which runs immediately after this one). Production
-- already had user_profiles via an earlier path; fresh DBs (Supabase
-- branch previews) hit `relation "user_profiles" does not exist`.
-- Guard with to_regclass so the identity-column add no-ops on fresh
-- DBs (the canonical create migration emits the same final schema)
-- and stays a no-op on production.
-- ----------------------------------------------------------------------

-- ---- F3-A: identity fields on user_profiles --------------------------------
-- email + phone_number already exist (added by 20260426120000). Add the four
-- remaining ContactInfo fields.
DO $$
BEGIN
  IF to_regclass('public.user_profiles') IS NOT NULL THEN
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS location TEXT,
      ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
      ADD COLUMN IF NOT EXISTS website_url TEXT;
  END IF;
END
$$;

-- ---- F3-H: resume version history ------------------------------------------
-- tailored_resumes is created by 20260423120000 which precedes this migration,
-- so no guard needed here.
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
