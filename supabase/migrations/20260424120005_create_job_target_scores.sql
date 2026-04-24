-- Per-target scores for job postings (#502).
-- One row per (job, target) pair. The global score on job_postings
-- stays as fallback when no target is selected.

CREATE TABLE IF NOT EXISTS job_target_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  score INT NOT NULL DEFAULT 0,
  score_breakdown JSONB,
  matched_keywords TEXT[] DEFAULT '{}',
  excluded BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_posting_id, target_id)
);

CREATE INDEX idx_jts_target ON job_target_scores(target_id);
CREATE INDEX idx_jts_job ON job_target_scores(job_posting_id);
