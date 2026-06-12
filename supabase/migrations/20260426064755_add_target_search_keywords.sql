-- ============================================
-- MIGRATION: Add search_keywords + activation_status to job_targets
-- ============================================
--
-- Supports target-based job fetching pipeline:
-- - search_keywords: role title variations derived by LLM, used to filter
--   jobs from ATS APIs when polling for a specific target
-- - activation_status: tracks the background pipeline state when a target
--   is activated (idle → deriving → polling → ready | error)

ALTER TABLE job_targets
  ADD COLUMN IF NOT EXISTS search_keywords JSONB DEFAULT '[]'::jsonb;

ALTER TABLE job_targets
  ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (activation_status IN ('idle', 'deriving', 'polling', 'ready', 'error'));
