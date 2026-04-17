-- ============================================
-- MIGRATION: Add provider column to job_sources
-- ============================================

ALTER TABLE job_sources
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'greenhouse';

-- Rename greenhouse_id to external_id in job_postings to support
-- multiple ATS providers with different ID types.
ALTER TABLE job_postings
  RENAME COLUMN greenhouse_id TO external_id;

-- Update the unique constraint name for clarity
ALTER TABLE job_postings
  DROP CONSTRAINT IF EXISTS job_postings_greenhouse_id_key;

-- Composite unique: same external ID from different providers could collide,
-- so scope uniqueness to (source_id, external_id).
ALTER TABLE job_postings
  ADD CONSTRAINT job_postings_source_external_unique UNIQUE (source_id, external_id);

-- Recreate index with new column name
DROP INDEX IF EXISTS idx_job_postings_greenhouse_id;
CREATE INDEX IF NOT EXISTS idx_job_postings_external_id ON job_postings(external_id);
