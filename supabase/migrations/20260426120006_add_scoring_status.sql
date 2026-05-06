-- Three-stage scoring pipeline: add scoring_status to job_target_scores.
-- Tracks how far through the pipeline a score has progressed:
--   stage1   = title-only match (fast, inline)
--   stage2   = full JD match (async)
--   complete = LLM analysis applied (async, for qualifying jobs)

ALTER TABLE job_target_scores
  ADD COLUMN IF NOT EXISTS scoring_status TEXT NOT NULL DEFAULT 'stage1'
  CHECK (scoring_status IN ('stage1', 'stage2', 'complete'));

CREATE INDEX IF NOT EXISTS idx_jts_scoring_status
  ON job_target_scores(scoring_status)
  WHERE scoring_status != 'complete';
