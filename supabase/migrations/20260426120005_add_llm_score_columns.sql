-- Add LLM score columns to job_postings.
-- llm_score: numeric score derived from the LLM analysis scorecard (0-100).
-- llm_analysis_id: FK to the job_analyses row that produced the score.

ALTER TABLE job_postings
  ADD COLUMN IF NOT EXISTS llm_score FLOAT,
  ADD COLUMN IF NOT EXISTS llm_analysis_id UUID REFERENCES job_analyses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_job_postings_llm_score
  ON job_postings (llm_score) WHERE llm_score IS NOT NULL;
