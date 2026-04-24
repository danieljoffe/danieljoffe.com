-- Resume uploads tracking table (#497).
-- Records each uploaded file, extracted text, and the prose doc version
-- it merged into. Original files stored in Supabase Storage bucket
-- "resume-uploads".

CREATE TABLE IF NOT EXISTS resume_uploads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID,
  filename        TEXT NOT NULL,
  file_type       TEXT NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  storage_path    TEXT NOT NULL,
  extracted_text  TEXT NOT NULL,
  prose_doc_id    UUID REFERENCES experience_prose_docs(id) ON DELETE SET NULL,
  page_count      INTEGER,
  file_size_bytes INTEGER NOT NULL,
  warnings        JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resume_uploads_user ON resume_uploads(user_id);

ALTER TABLE resume_uploads ENABLE ROW LEVEL SECURITY;
