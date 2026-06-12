-- Content-hash cache for derive_profile_from_jd LLM output.
--
-- `POST /targets/{id}/reference-jds` and `from-url` re-run Sonnet on the
-- same JD every call: same prompt, same input, same output, ~$0.01 + a
-- few seconds of latency each time. A typical user iterating on reference
-- JDs (paste, review, tweak the merged profile, re-paste) easily eats
-- 5-10 redundant calls per target.
--
-- Cache key components:
--   jd_hash         — SHA-256 of (prompt_version + model + jd_text). The
--                     prompt_version prefix means we never serve stale
--                     output when the prompt shifts; per the
--                     `feedback-llm-cache-prompt-version` rule, every
--                     LLM-output cache MUST include the prompt version.
--   prompt_version  — stored separately for audit / rollout queries.
--   model           — different models produce different outputs; key on it.
--
-- hit_count is purely observational so we can measure cache effectiveness
-- without a separate metrics pipeline.

create table if not exists public.target_derive_jd_cache (
  jd_hash         text primary key,
  prompt_version  text not null,
  model           text not null,
  derived_payload jsonb not null,
  hit_count       integer not null default 0,
  created_at      timestamptz not null default now(),
  last_hit_at     timestamptz
);

-- Lookups are always by primary key (the hash). Add a covering index on
-- (prompt_version, created_at) so an operator can sweep "what was cached
-- before the prompt change?" without a seq scan.
create index if not exists idx_target_derive_jd_cache_prompt_version
  on public.target_derive_jd_cache (prompt_version, created_at desc);

-- Service-role only; the API server is the only writer/reader. No RLS
-- needed because we never expose this table directly to JWT callers —
-- but flip enable_rls on so a future careless POLICY add doesn't open
-- it up by accident.
alter table public.target_derive_jd_cache enable row level security;
