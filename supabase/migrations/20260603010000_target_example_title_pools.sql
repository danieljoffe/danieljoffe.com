-- Few-shot example pools for the upcoming Phase 1 LLM title triage.
--
-- When a target is created (label-driven or JD-driven), the existing
-- ``derive_profile_from_label`` / ``derive_profile_from_jd`` LLM call
-- gets extended to emit two title lists alongside the scoring profile:
--
--   example_promising_titles   — ~8 titles the LLM considers good
--                                matches for the target. Used as
--                                positive few-shot examples when the
--                                cheap Phase 1 grader decides which
--                                new postings are worth scoring.
--
--   example_unpromising_titles — ~8 titles the LLM considers off-topic
--                                for the target. Negative few-shot
--                                examples — they sharpen the binary
--                                gate by giving the grader explicit
--                                "this is NOT it" anchors.
--
-- The pools are seeded once at target creation, persist through the
-- target's lifetime, and (in a follow-up PR) start incorporating user
-- thumbs-up / thumbs-down feedback once ≥5 labels per side accumulate
-- for a given target.
--
-- Both columns default to an empty array so existing rows don't break
-- and Phase 1 fail-opens cleanly (no examples → grader has only the
-- target label, still operable).

alter table public.targets
  add column if not exists example_promising_titles text[] not null default '{}',
  add column if not exists example_unpromising_titles text[] not null default '{}';
