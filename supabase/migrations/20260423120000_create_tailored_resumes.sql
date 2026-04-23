-- ============================================
-- MIGRATION: Create tailored_resumes (#185 P3d)
-- One row per tailoring attempt. Stores the full TailoredResume payload
-- (JSONB), the JD snapshot, LLM cost metadata, and a reference to the
-- `.docx` bytes in Supabase Storage. Failed lints are not persisted.
-- ============================================

CREATE TABLE IF NOT EXISTS tailored_resumes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID,
  job_posting_id    UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  resume_type       TEXT NOT NULL,
  jd_snapshot       TEXT NOT NULL,
  jd_snapshot_hash  TEXT NOT NULL,
  payload           JSONB NOT NULL,
  storage_path      TEXT,
  warnings          JSONB NOT NULL DEFAULT '[]'::jsonb,
  model             TEXT,
  input_tokens      INTEGER DEFAULT 0,
  output_tokens     INTEGER DEFAULT 0,
  cost_usd          NUMERIC(10, 6) DEFAULT 0,
  latency_ms        INTEGER DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tailored_resumes_job
  ON tailored_resumes(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_user_created
  ON tailored_resumes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tailored_resumes_jd_hash
  ON tailored_resumes(jd_snapshot_hash);

ALTER TABLE tailored_resumes ENABLE ROW LEVEL SECURITY;

-- Private bucket for generated .docx bytes. Access exclusively via the
-- service role key used by job-api. No anon policies.
INSERT INTO storage.buckets (id, name, public)
VALUES ('tailored-resumes', 'tailored-resumes', FALSE)
ON CONFLICT (id) DO NOTHING;
