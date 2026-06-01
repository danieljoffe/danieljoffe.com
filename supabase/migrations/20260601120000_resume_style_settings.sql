-- Resume style presets (docx typography).
--
-- Adds two nullable JSONB columns holding a {preset, accent} object:
--   * user_profiles.resume_style_settings — the user's default, applied to
--     every tailored-resume / cover-letter .docx export.
--   * documents.style_settings — a per-record override (column ships now; the
--     editing UI is deferred).
--
-- NULL is the load-bearing default: a row/profile with no style renders with
-- pandoc's unstyled default — byte-identical to pre-feature output, and the
-- existing markdown-only docx cache hash still matches. The styled render path
-- only engages once a user picks a style. No backfill, no forced re-render.
--
-- Forward-only and idempotent. Neither column is indexed (read only on the
-- per-row download path, never filtered on).

alter table public.user_profiles
  add column if not exists resume_style_settings jsonb;

alter table public.documents
  add column if not exists style_settings jsonb;
