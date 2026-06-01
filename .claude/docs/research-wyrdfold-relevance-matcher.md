# Wyrdfold Job Relevance Matcher — Research Report

**Symptom:** A director-level target is being served junior roles ("rep", "representative").
**Date:** 2026-05-31

---

## 1. Current Architecture

End-to-end scoring is a **three-stage pipeline** orchestrated by the poller and re-used by manual-job ingestion. All stages are pure-keyword today; no embeddings are involved in matching.

**Ingestion gate (poller).** For each ATS posting, `_title_matches_any_target()` (`apps/wyrdfold-api/app/services/poller.py:172-182`) calls `score_title_against_profile()` against every active target's `ScoringProfile`. If **any** keyword matches or a negative keyword fires (`excluded`), the job is admitted. Note that `search_keywords` (`targets.search_keywords` JSONB, migration `20260426064755_add_target_search_keywords.sql`) and the token-overlap helper `_title_matches_target` (`poller.py:211-244`) exist but are **not wired into the poll loop** — only `score_title_against_profile` is. So `search_keywords` is effectively dead code on the ingestion path.

**Stage 1 — title-only score.** `score_title_against_profile()` (`apps/wyrdfold-api/app/services/scoring.py:342-399`) walks every category keyword + seniority signal and applies `_keyword_or_alias_in_text` (`scoring.py:118-143`), which is a **plain `kw_lower in text` substring check** for any keyword >3 chars (`_keyword_in_text` at `scoring.py:24-36`). Score is normalised against `_calc_title_max_possible` (`scoring.py:332-339`).

**Stage 2 — full JD score.** `score_job_with_profile()` (`scoring.py:195-326`) parses the JD into weighted sections, applies the same `_keyword_or_alias_in_text` check across title + sections, and a `_TITLE_WEIGHT` of `2.0` (`scoring.py:176`). Negatives only fire in `requirements`/`default` sections + title (`scoring.py:288-304`).

**Stage 3 — LLM analysis.** Triggered when stage-2 score ≥ `LLM_SCORE_THRESHOLD = 40` (`poller.py:74-75`). `analyze_job` + `blend_scores` overlay an LLM scorecard onto the keyword score. Below the threshold, scoring is keyword-only.

The Postgres RPC `get_target_jobs` (`supabase/migrations/20260426120003_create_get_target_jobs_rpc.sql`) only reads from `job_target_scores`, filters by `excluded = FALSE` + `score >= p_min_score`, and paginates — it does **no scoring of its own**. The jobs router (`apps/wyrdfold-api/app/routers/jobs.py`) just overlays target scores onto postings.

---

## 2. Root-cause Hypothesis: why "Director" matches "Sales Rep"

The substring matcher in `_keyword_in_text` (`scoring.py:24-36`) uses a length check (`len(kw_lower) <= 3 and kw_lower.isalpha()`) to decide between word-boundary regex and raw `in`. Since `"director"` is 8 chars, it falls through to plain `in text`. This in itself does not produce "rep" matches — but combine it with how the LLM populates the profile:

1. **Seniority signals are weak strings, not gating.** `derive_profile_from_label.py` instructs the LLM to emit signals like `["5+ years", "lead", "mentor"]` (`derive_profile_from_label.py` SYSTEM_PROMPT, ~line 50-70). For a director target it will typically emit signals like `"director"`, `"vp"`, `"head of"`, `"5+ years"`, `"lead"`. **`"lead"` is a substring of `"leadership"`, `"leader"`, `"leads"`** — extremely common JD filler. So any "Sales Representative — Leads Outbound Pipeline" title (or even just a category keyword like `"sales"` for a sales-leadership target) triggers a stage-1 match.

2. **Match-OR semantics, not match-AND.** Stage-1 admission is "any keyword matched" (`poller.py:180`: `if result.matched_keywords or result.excluded`). A title-level match on **a single weak signal** (e.g. `"sales"` as a category keyword, or `"lead"` as a seniority signal) is enough to ingest the row and to produce a non-zero stage-1 score.

3. **Seniority is never enforced as a hard gate.** `SeniorityProfile.level` (`apps/wyrdfold-api/app/models/targets.py`, `class SeniorityProfile`) holds the level string (`"director"`) but **nothing in `scoring.py` or `poller.py` reads `.level`** — it only reads `.signals`. So the seniority level is decorative; only the textual signals fire, and they fire as substring matches.

4. **Negatives are LLM-suggested and incomplete.** `derive_profile_from_label.py` example negatives are `["junior", "intern", "entry-level"]`. Common junior-IC titles ("representative", "rep", "associate", "coordinator", "specialist", "I", "II") are typically **not** in the negative list, so they don't trigger `excluded = True`. Result: the row passes the gate at a low-but-nonzero stage-1 score and surfaces in the list, especially when sorted by `created_at`.

5. **Stage-2 inherits the same matcher.** The 2x `_TITLE_WEIGHT` boost (`scoring.py:237, 258, 276`) compounds title-token false positives. The LLM safety net (stage 3) only fires above score 40, so weak-but-not-zero matches stay keyword-only.

**TL;DR:** seniority is treated as a soft scoring nudge, not a filter; substring matching means weak tokens like `"lead"` or `"sales"` admit junior IC roles; and `search_keywords` (which could enforce role-title tokens) isn't actually used during polling.

---

## 3. Strengthening Options (effort × impact)

| #   | Option                                                                  | Effort               | Impact   | Notes                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------- | -------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | **Domain anti-patterns / hard-exclude title tokens for senior targets** | XS (1 file, ~30 LOC) | High     | When `seniority.level in {"director","vp","head","principal","staff"}`, prepend `["representative","rep","associate","coordinator","specialist","assistant","junior","intern","entry-level","i","ii","iii"]` to `profile.negative.keywords`. Enforce as **word-boundary** matches (fix `_keyword_in_text` length gate). Ships today.                 |
| B   | **Wire `search_keywords` into the poll gate**                           | S                    | High     | `_title_matches_target` (`poller.py:211-244`) already exists but is unreferenced. Change `_title_matches_any_target` to require BOTH a `search_keywords` token-overlap AND a profile keyword hit (currently `OR` semantics admit too much). Removes "Sales Rep" because no director target's `search_keywords` contains "rep" or "representative".   |
| C   | **Seniority-aware title scoring (boost + penalty)**                     | S                    | High     | Inside `score_title_against_profile`, after matching, compute a seniority delta: detect the title's own seniority tier (regex on `{director, vp, head, principal, staff, senior, mid, junior, intern, assistant, rep, associate, ...}`) and add a large negative if it's >1 tier below `profile.seniority.level`. Single function, no schema change. |
| D   | **Per-target must-include / must-exclude title tokens**                 | S-M                  | Med-High | Add `must_include_title_tokens` and `must_exclude_title_tokens` to `ScoringProfile`. Migration is JSONB additive (no schema-table change). Overlaps with the next investigation (per-target overrides) — coordinate.                                                                                                                                 |
| E   | **Voyage embedding similarity on titles**                               | M                    | Med      | Voyage client is already wired (`apps/wyrdfold-api/app/services/embeddings/voyage_client.py`, `voyage-3-lite` available at 512 dims). Compute cosine(title_embedding, target_label_embedding) once per posting; multiply into stage-1 score. Cheap (`voyage-3-lite` ~$0.02/1M tokens) but adds infra: cache, cost log, batch.                        |
| F   | **Stage-1.5 LLM title classification**                                  | M                    | Med      | Cheap Haiku call per admitted title: "Is this title at the {target.seniority.level} level for {target.label}? yes/no/maybe". Gate stage-2 on yes/maybe. Adds latency + cost to ingestion.                                                                                                                                                            |

Options A, B, C are independent and stackable. D is a schema/UX change. E and F are last-mile precision and only worth shipping once A-C land.

---

## 4. Recommendation — what to ship first

**Ship A + C together in a single PR.** Together they fix the failure deterministically:

- **A** prevents "Representative", "Rep", "Associate", "Coordinator" from ever scoring against a director target — implemented as word-boundary regex in `_keyword_in_text` (also fixing the silent "lead" → "leadership" substring bug) and as an automatic prepend of a `_JUNIOR_TITLE_TOKENS` constant to `profile.negative.keywords` at scoring time when `profile.seniority.level` is in the senior tier.
- **C** adds a seniority-tier delta so even untagged junior titles ("SDR", "BDR", "Coordinator I") get pushed below the `min_score` threshold instead of squeaking through.

**Migration impact:** zero. Both are pure code changes in `apps/wyrdfold-api/app/services/scoring.py` and a small constant table. **Re-scoring impact:** bump `targets.profile_version` so `bulk_score_for_target` (`target_scoring.py`) lazily re-scores existing rows on next poll. The `scores` table schema is unchanged; only score values flip. Existing director targets will see junior rows drop out of the list within one poll cycle.

**Then ship B in a follow-up** (wire `search_keywords` into the poller gate) — this is the structurally correct fix and makes the LLM-derived `search_keywords` column actually load-bearing. **Defer D** until the per-target override UI is designed (next investigation). **Defer E/F** until A-C are measured in production.

---

### Key citations

- `apps/wyrdfold-api/app/services/scoring.py:24-36` — substring vs word-boundary length gate (the silent-substring bug)
- `apps/wyrdfold-api/app/services/scoring.py:118-143` — `_keyword_or_alias_in_text`
- `apps/wyrdfold-api/app/services/scoring.py:342-399` — stage-1 title scoring
- `apps/wyrdfold-api/app/services/scoring.py:195-326` — stage-2 JD scoring
- `apps/wyrdfold-api/app/services/poller.py:172-182` — ingestion gate (`or` semantics)
- `apps/wyrdfold-api/app/services/poller.py:211-244` — unused `_title_matches_target`
- `apps/wyrdfold-api/app/models/targets.py` — `SeniorityProfile.level` (read nowhere in scoring)
- `apps/wyrdfold-api/app/services/targets/derive_profile_from_label.py` — LLM prompt seeding the profile
- `supabase/migrations/20260426120003_create_get_target_jobs_rpc.sql` — RPC does no scoring, only filtering
- `supabase/migrations/20260426064755_add_target_search_keywords.sql` — `search_keywords` column origin
