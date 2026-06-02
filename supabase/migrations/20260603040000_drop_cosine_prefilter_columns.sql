-- Drop the cosine-prefilter columns + HNSW indexes added in
-- ``20260601160000_relevance_prefilter_embeddings.sql``.
--
-- The cosine-based prefilter (``app/services/relevance_prefilter.py``)
-- was removed in PR #790 when Phase 1 LLM triage took over the
-- ingestion gate. The columns + indexes have sat unused since then —
-- this cleans them up to recover storage + index maintenance overhead.
--
-- Safe to run idempotently: ``drop ... if exists`` guards each
-- statement so re-running on an already-cleaned DB is a no-op.
--
-- pgvector extension stays. The ``experience_chunks`` resume-search
-- path still uses ``vector`` columns for retrieval, so we keep the
-- extension installed; only the prefilter-specific columns go.

drop index if exists public.idx_targets_label_embedding;
drop index if exists public.idx_jobs_title_embedding;

alter table public.targets
  drop column if exists label_embedding;

alter table public.jobs
  drop column if exists title_embedding;
