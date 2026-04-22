-- ============================================
-- MIGRATION: Create experience foundation tables (#185 P1)
-- Two-doc model: prose (user-owned) + optimized (LLM-derived, user-editable),
-- plus chunks for retrieval, conversation turns, and preferences.
-- user_id is nullable today (single user). Non-nullable is a migration away.
-- ============================================

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ----------------------------------------------------------------------------
-- Table: experience_prose_docs
-- Versioned, append-only narrative. The user owns this. The LLM appends via
-- conversation turns but never silently rewrites history.
-- "Current" prose doc = MAX(version) per user_id.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_prose_docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID,
  version     INTEGER NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS idx_experience_prose_user_version
  ON experience_prose_docs(user_id, version DESC);

-- ----------------------------------------------------------------------------
-- Table: experience_optimized_docs
-- LLM-derived structured projection of the prose doc. User-editable. Versioned
-- so regeneration cannot clobber manual edits.
-- payload shape: { roles: Role[], skills: Skill[], outcomes: Outcome[], summary }
-- markdown_view is a rendered view of payload for human diffing.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_optimized_docs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID,
  prose_doc_id   UUID REFERENCES experience_prose_docs(id) ON DELETE SET NULL,
  version        INTEGER NOT NULL,
  payload        JSONB NOT NULL,
  markdown_view  TEXT,
  source         TEXT NOT NULL DEFAULT 'llm'
                 CHECK (source IN ('llm', 'user_edit')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, version)
);

CREATE INDEX IF NOT EXISTS idx_experience_optimized_user_version
  ON experience_optimized_docs(user_id, version DESC);

-- ----------------------------------------------------------------------------
-- Table: experience_chunks
-- Retrieval index over the optimized doc. One row per retrievable unit
-- (role, skill, outcome, summary). Populated when an optimized doc is written.
-- chunk_type tags what facet the chunk represents — useful for weighted retrieval.
-- embedding dim: 1024 (Voyage voyage-3, Anthropic-aligned).
-- If we switch embedding models later, we alter the column dim.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_chunks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  optimized_doc_id   UUID NOT NULL REFERENCES experience_optimized_docs(id) ON DELETE CASCADE,
  chunk_type         TEXT NOT NULL
                     CHECK (chunk_type IN ('role', 'skill', 'outcome', 'summary')),
  chunk_ref          TEXT NOT NULL,
  content            TEXT NOT NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  embedding          extensions.vector(1024),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_chunks_optimized_doc
  ON experience_chunks(optimized_doc_id);
CREATE INDEX IF NOT EXISTS idx_experience_chunks_type
  ON experience_chunks(chunk_type);
CREATE INDEX IF NOT EXISTS idx_experience_chunks_embedding
  ON experience_chunks
  USING hnsw (embedding extensions.vector_cosine_ops);

-- ----------------------------------------------------------------------------
-- Table: experience_conversation_turns
-- Append-only chat log. conversation_type distinguishes onboarding from update.
-- Skipped questions are recorded with role='user' and content='__SKIP__'
-- so the LLM can see which prompts the user declined.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_conversation_turns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID,
  conversation_type  TEXT NOT NULL
                     CHECK (conversation_type IN ('onboarding', 'update')),
  turn_index         INTEGER NOT NULL,
  role               TEXT NOT NULL
                     CHECK (role IN ('user', 'assistant', 'system')),
  content            TEXT NOT NULL,
  skipped            BOOLEAN NOT NULL DEFAULT FALSE,
  prose_doc_id       UUID REFERENCES experience_prose_docs(id) ON DELETE SET NULL,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_experience_turns_user_created
  ON experience_conversation_turns(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_experience_turns_type
  ON experience_conversation_turns(conversation_type);

-- ----------------------------------------------------------------------------
-- Table: experience_preferences
-- Persistent style bias applied to every tailoring. One row per user_id.
-- payload shape: { rules: string[], avoid: string[], tone_notes: string[] }
-- Reset by deleting the row (or re-running onboarding clears it).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS experience_preferences (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID UNIQUE,
  payload     JSONB NOT NULL DEFAULT '{"rules": [], "avoid": [], "tone_notes": []}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- RLS: service_role-only, matching the jobs tables pattern.
-- ----------------------------------------------------------------------------
ALTER TABLE experience_prose_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_optimized_docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_conversation_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE experience_preferences ENABLE ROW LEVEL SECURITY;
