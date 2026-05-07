-- ============================================
-- MIGRATION: Add document_type to tailored_resumes (#185 P5)
-- The same table now holds both resumes and cover letters. The payload
-- JSONB shape differs per document_type (TailoredResume vs
-- TailoredCoverLetter). Existing rows default to 'resume'.
-- ============================================

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS document_type TEXT NOT NULL DEFAULT 'resume'
    CHECK (document_type IN ('resume', 'cover_letter'));

CREATE INDEX IF NOT EXISTS idx_tailored_resumes_document_type
  ON tailored_resumes(document_type, created_at DESC);
