-- Resume reuse within targets (#504)
-- Tracks lineage when a resume is cloned from an existing one
-- instead of being generated fresh.

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS source_resume_id UUID
    REFERENCES tailored_resumes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tailored_resumes_source
  ON tailored_resumes(source_resume_id);
