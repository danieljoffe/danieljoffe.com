-- Add salary_text column to job_postings
-- Stores human-readable salary info extracted from JSON-LD or description regex

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS salary_text TEXT;
