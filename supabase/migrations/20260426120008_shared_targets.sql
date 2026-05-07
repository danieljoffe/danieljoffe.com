-- Shared Targets Architecture (#553)
--
-- Targets become independent entities. Multiple users link to the same
-- target via user_targets. Scoring runs once per target, not per user.

-- 1. Add new columns to job_targets BEFORE dropping old ones
ALTER TABLE job_targets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE job_targets ADD COLUMN IF NOT EXISTS normalized_label TEXT;
ALTER TABLE job_targets ADD COLUMN IF NOT EXISTS profile_version INT NOT NULL DEFAULT 1;

-- Populate normalized_label from existing labels
UPDATE job_targets SET normalized_label = LOWER(TRIM(label))
WHERE normalized_label IS NULL;

-- Index for label matching (fuzzy and exact)
CREATE INDEX IF NOT EXISTS idx_job_targets_normalized_label
  ON job_targets(normalized_label);

-- 2. Create user_targets junction table
CREATE TABLE IF NOT EXISTS user_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  target_id UUID NOT NULL REFERENCES job_targets(id) ON DELETE CASCADE,
  resume_emphasis JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  fit_score INT,
  fit_score_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, target_id)
);

CREATE INDEX IF NOT EXISTS idx_user_targets_user
  ON user_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_targets_active
  ON user_targets(user_id) WHERE is_active = TRUE;

-- 3. Backfill: move existing targets to user_targets with sentinel user
INSERT INTO user_targets (user_id, target_id, resume_emphasis, is_active)
SELECT
  COALESCE(user_id, '__system__'),
  id,
  COALESCE(resume_emphasis, '{}'::JSONB),
  is_active
FROM job_targets
ON CONFLICT (user_id, target_id) DO NOTHING;

-- 4. Drop user-specific columns (now in user_targets)
ALTER TABLE job_targets DROP COLUMN IF EXISTS user_id;
ALTER TABLE job_targets DROP COLUMN IF EXISTS resume_emphasis;

-- 5. Trigger: maintain job_targets.is_active as global flag
--    A target is globally active if ANY user has it active.
CREATE OR REPLACE FUNCTION sync_target_active() RETURNS trigger AS $$
DECLARE
  _target_id UUID;
BEGIN
  -- Handle both INSERT/UPDATE (NEW) and DELETE (OLD)
  IF TG_OP = 'DELETE' THEN
    _target_id := OLD.target_id;
  ELSE
    _target_id := NEW.target_id;
  END IF;

  UPDATE job_targets SET is_active = EXISTS(
    SELECT 1 FROM user_targets
    WHERE target_id = _target_id AND is_active = TRUE
  ) WHERE id = _target_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_target_active ON user_targets;
CREATE TRIGGER trg_sync_target_active
  AFTER INSERT OR UPDATE OF is_active OR DELETE ON user_targets
  FOR EACH ROW EXECUTE FUNCTION sync_target_active();

-- 6. Add scored_profile_version to job_target_scores for lazy re-scoring
ALTER TABLE job_target_scores
  ADD COLUMN IF NOT EXISTS scored_profile_version INT NOT NULL DEFAULT 1;

-- 7. Enable pg_trgm for fuzzy label matching (Phase 3)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 8. RLS: user_targets should be accessible via service role (same as job_targets)
ALTER TABLE user_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on user_targets"
  ON user_targets
  FOR ALL
  USING (true)
  WITH CHECK (true);
