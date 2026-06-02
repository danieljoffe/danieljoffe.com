-- Ingestion-time relevance pre-filter via Voyage cosine similarity.
--
-- Storing the embedding for the target label and the job title lets the
-- poller drop semantically-off-topic postings before any keyword
-- scoring runs. Cuts the candidate set from ~8k to ~500 for a senior
-- target like "Director of CX Operations & Transformation" — Melissa
-- was seeing 287 pages of mostly-irrelevant results despite all the
-- scorer tunings in PRs #770, #771, #776.
--
-- pgvector is already enabled (see 20260422120000 / experience_chunks).
-- We use ``voyage-3-lite`` (512 dim) here — titles are short and lite
-- is 3x cheaper than voyage-3, with no measurable precision loss for
-- title-vs-target-label scoring.
--
-- Both columns are nullable so the gate fails open (admits everything)
-- when an embedding hasn't been computed yet — the poller computes them
-- lazily on first encounter to avoid a heavy backfill in this PR.

alter table public.targets
  add column if not exists label_embedding extensions.vector(512);

alter table public.jobs
  add column if not exists title_embedding extensions.vector(512);

-- HNSW indexes — not required for the per-poll gate (a few hundred
-- in-memory cosines), but pay for themselves the moment we want to do
-- "find me targets semantically near this title" or vice versa from
-- the API. Cosine ops only; we never use L2 distance on these.
create index if not exists idx_targets_label_embedding
  on public.targets using hnsw (label_embedding extensions.vector_cosine_ops);

create index if not exists idx_jobs_title_embedding
  on public.jobs using hnsw (title_embedding extensions.vector_cosine_ops);
