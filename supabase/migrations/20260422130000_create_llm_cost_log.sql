-- ============================================
-- MIGRATION: Create llm_cost_log (#185 P2a)
-- One row per LLM call. Powers cost tracking, debugging, and per-feature
-- spend analysis (purpose column groups calls by feature — onboarding,
-- derive, tailor, score_breakdown, etc.)
-- ============================================

CREATE TABLE IF NOT EXISTS llm_cost_log (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                         UUID,
  model                           TEXT NOT NULL,
  purpose                         TEXT NOT NULL,
  input_tokens                    INTEGER NOT NULL DEFAULT 0,
  output_tokens                   INTEGER NOT NULL DEFAULT 0,
  cache_read_input_tokens         INTEGER NOT NULL DEFAULT 0,
  cache_creation_input_tokens     INTEGER NOT NULL DEFAULT 0,
  cost_usd                        NUMERIC(10, 6) NOT NULL DEFAULT 0,
  latency_ms                      INTEGER NOT NULL DEFAULT 0,
  metadata                        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_llm_cost_log_created_at
  ON llm_cost_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_cost_log_user_purpose
  ON llm_cost_log(user_id, purpose, created_at DESC);

ALTER TABLE llm_cost_log ENABLE ROW LEVEL SECURITY;
