-- ============================================
-- MIGRATION: Create job pipeline tables
-- ============================================

-- Table: job_sources
-- Company boards to poll for job postings
CREATE TABLE IF NOT EXISTS job_sources (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_token     TEXT NOT NULL UNIQUE,
  company_name    TEXT NOT NULL,
  enabled         BOOLEAN DEFAULT TRUE,
  last_polled_at  TIMESTAMPTZ,
  job_count       INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_sources_enabled ON job_sources(enabled);

-- Table: job_postings
-- Scraped and scored job postings
CREATE TABLE IF NOT EXISTS job_postings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  greenhouse_id         BIGINT NOT NULL UNIQUE,
  source_id             UUID NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
  title                 TEXT NOT NULL,
  company_name          TEXT NOT NULL,
  location              TEXT,
  department            TEXT,
  description_html      TEXT,
  absolute_url          TEXT,
  score                 INTEGER NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_breakdown       JSONB,
  status                TEXT NOT NULL DEFAULT 'new'
                        CHECK (status IN ('new', 'saved', 'applied', 'rejected', 'archived')),
  greenhouse_updated_at TIMESTAMPTZ,
  first_seen_at         TIMESTAMPTZ DEFAULT NOW(),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_postings_score ON job_postings(score DESC);
CREATE INDEX IF NOT EXISTS idx_job_postings_status ON job_postings(status);
CREATE INDEX IF NOT EXISTS idx_job_postings_source ON job_postings(source_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_greenhouse_id ON job_postings(greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON job_postings(created_at DESC);

-- Table: job_status_log
-- Audit trail of user status changes
CREATE TABLE IF NOT EXISTS job_status_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posting_id  UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_status_log_posting ON job_status_log(posting_id);

-- Enable RLS (all access via service_role — no anon policies)
ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_status_log ENABLE ROW LEVEL SECURITY;
