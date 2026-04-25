-- ============================================
-- MIGRATION: Resume lifecycle (#505)
-- Fixes latent bug: batch.py already writes 'resume_draft' but the
-- CHECK constraint didn't include it. Also adds new lifecycle statuses
-- (resume_ready, interviewing, offer) and approval tracking columns.
-- ============================================

-- Fix CHECK to include resume_draft (latent bug) + add new statuses
ALTER TABLE job_postings DROP CONSTRAINT IF EXISTS job_postings_status_check;
ALTER TABLE job_postings ADD CONSTRAINT job_postings_status_check
  CHECK (status IN ('new', 'saved', 'resume_draft', 'resume_ready',
                    'applied', 'interviewing', 'offer', 'rejected', 'archived'));

-- Lifecycle columns on tailored_resumes
ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tailored_resumes_approved
  ON tailored_resumes(approved_at) WHERE approved_at IS NOT NULL;
