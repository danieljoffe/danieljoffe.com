-- Job analyses: LLM-generated scorecard + recommendation per job posting.
-- One row per (user, job_posting) pair. ON DELETE CASCADE cleans up
-- when the parent job_posting is removed.

CREATE TABLE IF NOT EXISTS job_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  user_id UUID,
  optimized_doc_id UUID,
  scorecard JSONB NOT NULL,
  recommendation TEXT NOT NULL,
  model TEXT NOT NULL,
  cost_usd NUMERIC NOT NULL DEFAULT 0,
  latency_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_analyses_job_id ON job_analyses(job_posting_id);
CREATE INDEX idx_job_analyses_user_job ON job_analyses(user_id, job_posting_id);
