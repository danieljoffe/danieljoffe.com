-- Batch resume generation tracking (#503)
CREATE TABLE IF NOT EXISTS batch_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total       INTEGER NOT NULL,
  completed   INTEGER NOT NULL DEFAULT 0,
  failed      INTEGER NOT NULL DEFAULT 0,
  items       JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_batch_jobs_user ON batch_jobs(user_id);
ALTER TABLE batch_jobs ENABLE ROW LEVEL SECURITY;
