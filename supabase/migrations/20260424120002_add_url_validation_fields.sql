-- Add URL validation tracking to job_postings (#496)
ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS url_validation_status TEXT DEFAULT NULL
    CHECK (url_validation_status IN ('valid', 'rejected')),
  ADD COLUMN IF NOT EXISTS url_validation_warnings JSONB DEFAULT '[]'::jsonb;
