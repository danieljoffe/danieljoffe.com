# Implementation Plan: Streamlined Target Creation & Grading

**Author:** Claude (overnight session, 2026-06-02)
**Status:** Architectural change. Ships as a phased migration (additive first, drop legacy second).
**Prereq:** Phase 1 + Phase 2 in production with `PHASE1_TRIAGE_ENABLED=true` and `PHASE2_ENABLED=true` (✅ done). Relevance diagnosis (separate plan) should run first to validate which Phase 2 axes are pulling weight.

## Goal

Align target _creation_ with how the new pipeline actually _scores_. Today,
target derivation still emits the legacy keyword scaffolding (categories with
weights, seniority signal lists, negative keyword lists) — a shape designed
for the keyword-Stage-2 scorer that Phase 2 has replaced. That's:

- Extra LLM cost at creation (more JSON to generate).
- Confusing surface area for the user / for prompt evolution.
- Schema drift: target shape doesn't match scorer vocabulary, so plan item
  #7 (feedback → prompt evolution) has a translation problem.

The "one rubric end-to-end" promise from `plan-llm-scoring-migration.md`
finally lands when target creation, Phase 1, and Phase 2 all speak the same
vocabulary.

## Today's target shape (legacy)

```python
class JobTarget:
    label: str
    scoring_profile: ScoringProfile  # ← almost entirely unused by Phase 1/2
    #   .categories: dict[str, CategoryProfile]
    #     .keywords: dict[str, int]  (weights)
    #     .weight: float
    #   .seniority.level: str
    #   .seniority.signals: list[str]
    #   .domain.signals: list[str]
    #   .domain.weight: float
    #   .negative.keywords: list[str]
    #   .negative.weight: float
    search_keywords: list[str]
    example_promising_titles: list[str] | None
    example_unpromising_titles: list[str] | None
    profile_version: int
    is_active: bool
```

What each phase actually reads:

| Surface                                                  | Reads                                                                                                                                                           |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ingestion title-match gate (`_title_matches_any_target`) | `search_keywords`                                                                                                                                               |
| Keyword Stage 1/2 (now placeholder under Phase 2)        | full `scoring_profile`                                                                                                                                          |
| Phase 1 title triage (`relevance/title_triage.py`)       | `label`, `example_promising_titles`, `example_unpromising_titles`                                                                                               |
| Phase 2 fit grading (`fit/job_fit.py`)                   | `label`, loose pass over `scoring_profile.categories`, `scoring_profile.seniority.level`, `scoring_profile.domain.signals`, `scoring_profile.negative.keywords` |

Phase 2 specifically uses categories only to inject "name + top-10 keywords"
into the prompt's `## Target` block. A richer prose description would carry
more signal than a keyword list and remove the cross-schema translation.

## Proposed target shape (slim, LLM-native)

```python
class JobTarget:
    label: str

    # NEW — what this role actually is, in 1–2 paragraphs.
    # Feeds Phase 2 + Phase 3 prompts directly. Replaces the per-category
    # keyword list as the "what we're looking for" context.
    description: str

    # NEW — single canonical level for Phase 2's seniority_fit axis.
    # Free-form ``scoring_profile.seniority.signals`` is gone.
    seniority_hint: Literal["ic", "senior", "staff", "manager", "director", "vp", "c_level"]

    # NEW (optional) — domain context for Phase 2's domain_fit axis.
    # Empty list = domain-agnostic target.
    domain_hints: list[str]

    # Existing — gates ingestion (must overlap with job title tokens).
    search_keywords: list[str]

    # Existing (PR #788) — Phase 1 few-shot pools.
    example_promising_titles: list[str]
    example_unpromising_titles: list[str]

    # Existing operational fields.
    profile_version: int
    is_active: bool

    # DEPRECATED — kept on legacy rows during the transition.
    # Stage 2 keyword scorer keeps reading from here as a fallback when
    # Phase 2 hasn't graded yet (or is disabled). New targets leave this
    # NULL. Removed entirely in a follow-up once legacy targets are gone.
    scoring_profile: ScoringProfile | None
```

Drops (from new targets):

- `scoring_profile.categories.*` (15-30 keywords × weights)
- `scoring_profile.seniority.signals` (replaced by `seniority_hint` enum)
- `scoring_profile.domain.signals` (replaced by `domain_hints` list)
- `scoring_profile.negative.keywords` (replaced by Phase 1 unpromising titles)

## One-shot derivation

Replace the two existing derivers (`derive_profile_from_label`,
`derive_profile_from_jd`) with a single `derive_slim_target` function. One
Sonnet call. One JSON output. Schema matches the new target shape exactly.

```python
class SlimTargetDerived(BaseModel):
    description: str = Field(min_length=80, max_length=600)
    seniority_hint: SeniorityHint
    domain_hints: list[str] = Field(max_length=8, default_factory=list)
    search_keywords: list[str] = Field(min_length=3, max_length=15)
    example_promising_titles: list[str] = Field(min_length=8, max_length=12)
    example_unpromising_titles: list[str] = Field(min_length=8, max_length=12)

async def derive_slim_target(
    llm: LLMClient,
    *,
    label: str,
    payload: OptimizedPayload,
    reference_jd_text: str | None = None,  # optional, when deriving from JD
) -> tuple[SlimTargetDerived, LLMResult]:
    ...
```

Prompt structure (cache-friendly: static system → user profile → variable
label + optional JD):

```
SYSTEM
You are deriving a job-search target for a specific user. Given the user's
profile and a target role label (and optionally a reference job description),
produce a structured target that downstream LLMs use to triage and grade
jobs.

For description:
- 1-2 paragraphs that capture WHAT THIS ROLE IS, who hires for it, and the
  flavor of work (operations-heavy? IC craft? transformation-led?).
- Be specific to the user's actual experience — don't echo the label.
- Avoid vague phrases like "great team player". Anchor in concrete signals
  (Salesforce stack, P&L responsibility, IPO-stage scaling).

For seniority_hint: pick the single level the user is targeting. ic for
junior/mid IC, senior for senior IC, staff for staff/principal IC,
manager for first-line manager, director for director/sr-director, vp for
VP/SVP, c_level for C-suite.

For domain_hints: 3-6 industries / verticals / product types relevant to
this target. Empty if domain-agnostic.

For search_keywords: the exact phrases a recruiter would put in a JD title
for this role. These gate ingestion — overly narrow = miss; overly broad =
noise.

For example_promising_titles: 10 titles a downstream LLM should mark as
PROMISING when they appear on a job board. Diverse phrasings.

For example_unpromising_titles: 10 titles that share keywords with the
target but are NOT the right role function. Best examples are common
false-positives (Director of Sales vs Director of CX Ops).

Return JSON matching the schema. No prose, no markdown.

USER
## User profile
{payload as markdown}

## Target label
{label}

[## Reference JD (optional)
{first 2000 chars of JD text}]
```

Reuses `_profile_summary` from `app/services/targets/suggest.py` for the
profile slot. Same `purpose = "target.derive.slim"` for cost logging.

Cost: ~3K input + ~500 output ≈ $0.012/derivation at Sonnet 4.6 (vs ~3 calls
in the legacy flow at ~$0.020 total). Cheaper AND simpler.

## Phase 1 prompt update

Phase 1 (`relevance/title_triage.py`) already consumes example pools. Add the
new `description` to the user message so the LLM gets richer context than
"target label + 10 example titles":

```
Target role: {label}
Target description: {description}

Examples of PROMISING titles for this target:
- {example_promising_titles[0]}
...
```

Cache-friendly: per-target prefix stays stable across the cycle's batches.

## Phase 2 prompt update

`fit/job_fit.py` builds the `## Target` block from
`scoring_profile.categories`. Replace with:

```python
target_lines = [f"## Target: {target.label}"]
if target.description:
    target_lines.append(target.description)
target_lines.append(f"Seniority level: {target.seniority_hint}")
if target.domain_hints:
    target_lines.append(f"Domain: {', '.join(target.domain_hints)}")
# Legacy categories block only when ``description`` is null:
elif target.scoring_profile and target.scoring_profile.categories:
    # ... existing code path, unchanged
```

This is a hot path — keep the legacy branch alive until all targets have
`description`. The branch dies in the follow-up cleanup PR.

## Schema migration

```sql
-- 20260603140000_targets_slim_shape.sql

alter table public.targets
  add column if not exists description text,
  add column if not exists seniority_hint text,  -- enum-as-text for forward-compat
  add column if not exists domain_hints text[] default '{}'::text[];

-- No NOT NULL — legacy targets stay valid with NULL slim fields.
-- New targets populated by derive_slim_target on creation.

comment on column public.targets.description is
  'LLM-derived target description (slim shape, replaces scoring_profile.categories prose). '
  'NULL on legacy targets; populated on new targets by derive_slim_target.';
comment on column public.targets.seniority_hint is
  'Single seniority level for Phase 2 prompt. One of ic, senior, staff, manager, director, vp, c_level.';
comment on column public.targets.domain_hints is
  'Domain context for Phase 2 domain_fit axis. Empty array = domain-agnostic.';
```

Migration is additive; no backfill required up-front. Legacy targets keep
working. New target creation populates the new columns.

## Backfill (optional, follow-up)

Once Phase 2 is the authoritative scorer for ALL targets, run a one-time
`scripts/backfill_slim_target.py`:

- Iterate all targets where `description IS NULL`.
- For each, call `derive_slim_target` (using the target's owner's optimized
  payload).
- Update with the slim fields; bump `profile_version`.

Cost: 3 active targets × ~$0.012 = trivial. Idempotent (only touches
`description IS NULL` rows).

After backfill, the follow-up cleanup PR can:

- Drop the Phase 2 prompt's `elif scoring_profile.categories` branch.
- Drop the `scoring_profile` column entirely from new writes (NULL it on update).
- Drop keyword Stage 2 scoring (`bulk_score_for_target`, `target_score_and_upsert`).

## Test plan

- Unit: `tests/test_derive_slim_target.py` — happy path, all fields validated; truncation behavior on overly long descriptions; min-count enforcement on example pools.
- Integration: full target creation flow returns the slim shape; legacy target read returns both `scoring_profile` (legacy) and the new fields (NULL until backfilled).
- Phase 1/2 prompt regression: use the diagnosis findings doc's calibration cases (§1 of plan-wyrdfold-relevance-diagnosis.md) as a regression suite. Re-run after this PR; scores shouldn't drift > ±10 points on average.
- E2E: create a new target via the UI/API → verify it has `description`, `seniority_hint`, `domain_hints` populated and `scoring_profile` is null (or minimal).

## Rollout sequence

Three PRs, each independently revertable.

1. **PR A — schema + derivation** (this plan, core)
   - Migration adds the three new columns.
   - `derive_slim_target` ships and is wired into the target-creation endpoint.
   - Phase 1 + Phase 2 prompts updated to read the new fields with legacy fallback.
   - Existing targets untouched.

2. **PR B — backfill script + run** (after PR A bakes)
   - `scripts/backfill_slim_target.py`.
   - Run on all 3 active targets.
   - Spot-check that Phase 2 scores don't drift > ±10 points (use diagnosis findings as the regression set).

3. **PR C — cleanup, drop legacy path** (after PR B + 1 week of stability)
   - Remove `elif scoring_profile.categories` branch from Phase 2 prompt builder.
   - Remove keyword Stage 2 scoring entirely (`bulk_score_for_target`, the keyword `score_and_upsert` path, related tests).
   - Drop `scoring_profile` writes from `derive_slim_target` outputs (already NULL there).
   - Eventually drop the `scoring_profile` column itself (separate cleanup once nothing reads it).

## Acceptance criteria

PR A:

- New target creation returns slim fields; legacy reads still work.
- Phase 1 + Phase 2 prompts include `description` when present.
- Existing target Phase 2 scores stable (regression on diagnosis findings within ±10 points).

PR B:

- All 3 active targets have `description`, `seniority_hint`, `domain_hints` populated.
- Phase 2 scores on existing rows stable post-backfill.

PR C:

- Keyword Stage 2 code path removed.
- All wyrdfold-api tests green; ~50 LOC net reduction.

## Risks

- **Phase 2 prompt regression from removing keyword context.** Mitigation: the legacy branch stays in PR A; we measure regression before PR C. If Phase 2 scores drift > ±10 points without the keyword block, the description prompt needs tuning before cleanup.
- **`derive_slim_target` description quality**. Mitigation: min-length validator (80 chars) + few-shot example in the prompt. Spot-check 3 targets manually post-backfill.
- **Frontend/UI dependencies on `scoring_profile`**. Audit: `apps/wyrdfold/src/` for references; expect target-settings pages to render keyword categories. Decide per-component whether to render slim-shape equivalents or just hide the legacy display.
- **Schema churn for active beta testers**. Mitigation: additive-only migration; no NOT NULL constraints; legacy reads keep working.

## Out of scope

- The feedback example pool (plan item #7) — orthogonal, builds on top of the slim shape.
- Phase 3 deep dive (plan item #8) — also benefits from the slim shape but separate PR.
- Logistics chips — see plan-wyrdfold-logistics-chips.md.

## Connection to relevance diagnosis

The diagnosis plan (plan-wyrdfold-relevance-diagnosis.md) will tell us whether
each Phase 2 axis (title/skills/seniority/domain) is actually pulling its
weight. If domain_fit turns out to be dead weight (low variance, low
correlation with overall score), we can drop `domain_hints` from the slim
target shape before PR A ships — making the migration even simpler.

**Run diagnosis first. Use its findings to refine this plan, then execute.**
