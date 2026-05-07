-- ============================================
-- MIGRATION: Add payload_md to tailored_resumes (#XXX)
--
-- The tailor system is moving to markdown as the source of truth for
-- the editable resume/cover letter. Structured `payload` (JSONB) is
-- kept in place during the transition and will be dropped in a
-- follow-up after a one-shot backfill populates `payload_md` and the
-- frontend has flipped to the markdown editor.
--
-- Both columns are nullable for now. The backfill script
-- (apps/job-api/scripts/backfill_payload_md.py) populates payload_md
-- from each row's structured payload via the canonical markdown
-- serializer.
-- ============================================

ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS payload_md TEXT;

ALTER TABLE tailored_resume_versions
  ADD COLUMN IF NOT EXISTS payload_md TEXT;

-- Cache key: when storage_path was rendered, this is the sha256 of
-- payload_md at render time. Lets the download endpoint serve cached
-- bytes when the markdown hasn't changed since last render.
ALTER TABLE tailored_resumes
  ADD COLUMN IF NOT EXISTS docx_payload_md_hash TEXT;
