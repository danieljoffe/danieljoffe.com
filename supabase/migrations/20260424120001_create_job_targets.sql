-- ============================================
-- MIGRATION: Create job_targets + target_reference_jds (#495)
-- ============================================

-- Table: job_targets
-- A "lens" for job search — each target has its own scoring profile
-- derived from reference JDs, and resume emphasis hints for the tailor.
CREATE TABLE IF NOT EXISTS job_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         TEXT,                                      -- nullable for single-user v1
  label           TEXT NOT NULL,
  scoring_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  resume_emphasis JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_targets_active ON job_targets(is_active, created_at DESC);

-- Table: target_reference_jds
-- Original JDs used to derive a target's scoring profile. Preserved
-- for audit and re-derivation when profiles are merged.
CREATE TABLE IF NOT EXISTS target_reference_jds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id         UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  jd_url            TEXT,
  jd_text           TEXT NOT NULL,
  extracted_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_target_ref_jds_target ON target_reference_jds(target_id);

-- Add nullable target_id FK to job_postings (multi-target ready)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS target_id UUID REFERENCES job_targets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_postings_target ON job_postings(target_id);

-- RLS (all access via service_role — no anon policies)
ALTER TABLE job_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE target_reference_jds ENABLE ROW LEVEL SECURITY;
