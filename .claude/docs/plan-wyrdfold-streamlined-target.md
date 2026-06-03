# Implementation Plan: Streamlined Target Creation & Grading

**Author:** Claude (overnight session, 2026-06-02)
**Status:** Architectural change. Ships as a phased migration (additive first, drop legacy second).
**Prereq:** Phase 1 + Phase 2 in production with `PHASE1_TRIAGE_ENABLED=true` and `PHASE2_ENABLED=true` (✅ done). Relevance diagnosis (separate plan) should run first to validate which Phase 2 axes are pulling weight.

## Concepts (canonical vocabulary)

Several mechanisms share related wording. Pin them down once so the rest of the doc — and the code — never conflates them.

| Term                  | What it is                                                                                          | Where it lives                                                                                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Axis scores**       | Four 0–100 numbers Phase 2 emits per job: `title_fit`, `skills_fit`, `seniority_fit`, `domain_fit`. | `scores.axis_scores` jsonb. Set at grading time, immutable after.                                                                                                               |
| **Display score**     | The number rendered to the user on a job row. Defaults to the raw Phase 2 score.                    | Computed at read time. Equals the axis blend when the user has axis weights set, else equals the raw score.                                                                     |
| **Axis weights**      | Per-(user, target) multipliers that re-weight the four axes into the display score.                 | `user_targets.axis_weights` jsonb. Set via `PATCH /targets/{id}/axis-weights`. **Tunes the score; does not filter the list.**                                                   |
| **Logistics filters** | Pre-list filters on remote/hybrid/onsite, salary band, etc. Drop rows from view based on criteria.  | `scores.logistics_filters` jsonb (extracted by Phase 2 grader — see `plan-wyrdfold-logistics-chips.md`). Applied via `/jobs?…` query params. **Filters the list; not a score.** |
| **Logistics chips**   | The FE rendering of `logistics_filters` as filter pills above the job list.                         | UI only.                                                                                                                                                                        |
| **Slim target shape** | The new target schema: `description`, `seniority_hint`, `domain_hints`, search/example keywords.    | `targets` table — `description`, `seniority_hint`, `domain_hints` columns. Replaces legacy `scoring_profile`.                                                                   |
| **Lateral discovery** | Sonnet mines master payload → adjacent target suggestions the user is competitive for.              | `app/services/targets/lateral_discovery.py`. One-off call; suggestions persisted in `target_suggestions` table (planned).                                                       |

**Axis weights vs logistics filters: independent.** Axis weights change _how the score is computed_. Logistics filters drop rows from the list _before/after the score is shown_. They never collide in the data path. Treat them as different mechanisms in code, in the UI, and in conversation.

**Code discipline.** Never reuse the word "logistics" inside scoring code (axis names, score-breakdown keys, prompt section headers). Reserve it for the filter pipeline. The fourth axis is `domain_fit`, not `logistics_fit`, and there is no plan to rename it.

## Pipeline (end-to-end)

```
                    ┌──────────────────┐
   Job ingested ──▶ │ Phase 1 triage   │ ──▶ promising? ──┐
                    │ (Haiku, title)   │                  │
                    └──────────────────┘                  │
                                                          ▼
                    ┌─────────────────────────────────────────────┐
                    │ Phase 2 grading (Sonnet, JD body)           │
                    │                                             │
                    │   emits:  axis_scores  { title_fit,         │
                    │                          skills_fit,        │
                    │                          seniority_fit,     │
                    │                          domain_fit }       │
                    │           raw_score    (current blend)      │
                    │           logistics_filters { remote_status,│
                    │                                salary_min,  │
                    │                                salary_max,  │
                    │                                … }          │
                    └─────────────────────────────────────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │ /jobs read path (per user, per request)  │
                    │                                          │
                    │   1. Look up user's axis_weights for     │
                    │      this (user, target) pairing.        │
                    │   2. Compute display_score from          │
                    │      axis_scores × axis_weights          │
                    │      (passthrough = raw_score if none).  │
                    │   3. Apply logistics filters from        │
                    │      query params (remote=true, etc.)    │
                    │      against scores.logistics_filters.   │
                    │   4. Sort by raw_score / recency_score.  │
                    │      (Sort-by-display is v2.)            │
                    └──────────────────────────────────────────┘
                                          │
                                          ▼
                                     job list page
                                  ┌───────────────────┐
                                  │  [chips: Remote]  │ ← logistics_filters
                                  │  [chips: $150k+]  │
                                  │  ─────────────    │
                                  │  Job A   88       │ ← display_score
                                  │  Job B   85       │
                                  │  Job C   82       │
                                  └───────────────────┘
```

Axis-weight sliders live on the per-target settings page. Logistics chips live above the job list. The two never share a parent UI region.

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

## Lateral target discovery (first-class capability)

The slim-target shape unlocks a feature the legacy keyword target couldn't
support well: **mine the master document for lateral / adjacent target
roles the user is already competitive for** but might not have considered.

**The problem.** A user signs up with one target in mind ("Director of CX
Operations"). Their master doc contains evidence for many adjacent
targets — Director of Customer Success Operations, VP of Customer
Experience, Head of Support Engineering, Director of Member Experience —
same career altitude, different vocabulary that's gatekept by industry
naming conventions. Today they have to know each variant exists and add
each manually. Most users don't, so they undercount their candidate
pool.

**The capability.** A new function alongside `derive_slim_target`:

```python
async def suggest_lateral_targets(
    llm: LLMClient,
    *,
    payload: OptimizedPayload,
    current_targets: list[JobTarget] = [],   # don't re-suggest these
    max_suggestions: int = 8,
) -> list[SuggestedTarget]:
    ...

class SuggestedTarget(BaseModel):
    label: str
    one_line_reasoning: str  # why this user is competitive for it
    confidence: int  # 0-100
    lateral_relationship: str  # how it differs from current targets
    primary_industry: str | None  # CX SaaS, payroll fintech, etc.
```

**Prompt shape.** One Sonnet call. System prompt: "Given the user's full
career evidence, propose 5-10 distinct target roles they're competitive
for. Span industries; include at least one career-stretch suggestion;
exclude exact duplicates of current targets. For each, output {label,
reasoning, confidence, lateral_relationship, primary_industry}."

**Where it lives in the user flow.**

- **Onboarding:** after the user uploads their master doc, the platform
  runs `suggest_lateral_targets` and presents 5-10 candidate targets.
  User picks 3-5 to activate. Each picked target then runs
  `derive_slim_target` to produce its slim shape. Total cost:
  ~$0.05 (suggestion) + ~$0.012 × N picked (derivation) = ~$0.10
  for a 5-target onboarding.
- **Existing-user growth:** weekly cron OR on-demand "find more targets"
  button. Reruns suggestion with `current_targets` populated, surfaces
  fresh adjacents the user hasn't tried. Same cost as onboarding.

**Why this needs the slim shape (not the legacy one).** Auto-creating
targets requires the derivation to be (a) cheap, (b) self-contained, (c)
low-friction for the user to review. The legacy keyword profile is too
heavyweight: 30+ keywords with weights, category structures, seniority
signals — a wall of config the user can't meaningfully review per
suggestion. The slim shape is reviewable at a glance: label +
description + seniority + 10 example titles. Users can scan-and-pick.

**Why this changes the product mental model.** Today: "tell me your
target, I'll find jobs." With lateral discovery: "tell me your career,
I'll find your targets." Reduces vocabulary-gatekeeping; expands
candidate pool 3-5x for users whose target-naming knowledge is
incomplete (which is most users, including senior ones in niche
industries).

**Sequencing.** Ships as **PR D** in the rollout (after PR A schema +
PR B backfill, before PR C cleanup). Doesn't block any of A/B/C; can
ship in parallel. Adds: `app/services/targets/lateral.py` (the
suggester) + frontend onboarding flow change + an optional cron entry
for periodic refresh.

**Connection to Phase 1 example pools.** Suggested targets that get
activated automatically grow the cross-target "promising example pool":
if 3 users have a "Director of CX Operations" target and another user
activates a suggested "Director of Customer Success Operations" target,
the example_promising_titles from the related targets can cross-pollinate
(opt-in). Future improvement; out of scope for the initial PR D.

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

4. **PR D — lateral target discovery** (parallel with A/B/C)
   - `suggest_lateral_targets()` + onboarding flow change + optional refresh cron.
   - See "Lateral target discovery" section above.

5. **PR E — user-tunable axis weights** (after PR A so axis fields exist; can ship before C)
   - See "User-tunable axis weights" section below.

## User-tunable axis weights (PR E)

The legacy `scoring_profile.categories.*.weight` was LLM-set internal config feeding a keyword scorer the new pipeline doesn't use. The weighting CONCEPT was right, just applied to the wrong layer. PR E moves it from "hidden keyword weights consumed by Stage 2" to **"4 visible sliders the user controls, applied to Phase 2's axis breakdown at display time"**.

### Mental model

| Layer          | Purpose                                    | Lives on                             |
| -------------- | ------------------------------------------ | ------------------------------------ |
| `target`       | "what role am I looking for"               | `targets` (slim shape)               |
| `axis_weights` | "how I weigh tradeoffs between dimensions" | `user_targets` (per-user-per-target) |
| `filters`      | "what I won't consider at all"             | URL params / saved view              |

### Schema

```sql
alter table public.user_targets
  add column if not exists axis_weights jsonb default '{
    "title_fit": 0.25,
    "skills_fit": 0.25,
    "seniority_fit": 0.25,
    "domain_fit": 0.25
  }'::jsonb;

alter table public.user_targets
  add column if not exists axis_weights_previous jsonb;

comment on column public.user_targets.axis_weights is
  'User-tunable weights applied to Phase 2 axis scores at read time to '
  'produce display_score. Defaults to equal quartile (matches Sonnet''s '
  'holistic judgment). Adjusting weights does NOT trigger re-grading.';
comment on column public.user_targets.axis_weights_previous is
  'One-step-back snapshot for the "undo" button. Only the most recent '
  'previous state is kept; not a full history.';
```

Validation: each axis ∈ [0, 1], sum constrained loosely (we'll renormalize at read-time if it drifts).

### Read-time math (`/jobs` router)

```python
def display_score(axes: dict[str, int], weights: dict[str, float]) -> int:
    total = sum(weights.values()) or 1.0
    return round(sum(axes.get(a, 0) * weights.get(a, 0.25) for a in AXES) / total * 4)
    # × 4 because equal weights of 0.25 should reproduce the existing axis-mean
    # (not divide-by-1 sum). Tuned so default weights ≈ Sonnet's overall score.
```

The `× 4` factor is so default weights (0.25 each) produce a display_score very close to Sonnet's holistic `fit_score`. We'll calibrate against the eval set so the transition is smooth.

### Safety design (user-facing)

#### 1. Pre-change preview (before "Save")

> Your top 10 would reorder: 4 jobs change position
> 7 jobs currently below your 50-score floor would now appear
> 2 jobs you've already dismissed would re-surface

Pure math on existing axis scores. No LLM cost. Computed inline when the user drags a slider; debounced.

#### 2. Warning copy on edit screen

> ⚠️ Adjusting these weights changes how every job is scored for this target. Scores you've grown used to — and the order jobs appear — will shift. Start with small changes (0.30 → 0.35) and watch your list for a few days before adjusting further.

#### 3. One-click undo

"Undo last change" button reverts to `axis_weights_previous`. Snapshot the prior state on every save.

#### 4. Settings-buried

Lives under target settings → "Advanced". The 95% of users who don't tune weights never see them. No surfacing on the main jobs list.

#### 5. Reset to defaults

Always-visible button. Resets to equal-quartile.

### Three feedback loops (architecture)

| Loop                            | Driven by                           | Affects                              | Cost                                           |
| ------------------------------- | ----------------------------------- | ------------------------------------ | ---------------------------------------------- |
| **Example pools**               | aggregate 👍/👎 at target           | Phase 1 admit/reject                 | Free at read; one LLM call when ≥5 thumbs/side |
| **Weight suggestions**          | aggregate 👍/👎 + axis correlations | Display scoring (user-facing nudges) | Pure math, no LLM                              |
| **Per-target prompt iteration** | manual operator decision            | Phase 2 grading itself               | LLM call per re-grade                          |

All three are independent and can ship on their own timelines.

### Feedback-driven weight suggestions (sub-feature, ships LAST)

Once plan item #7 (feedback example pool) has enough 👍/👎 data per target (≥10 each side):

```
"We noticed 8 of your 10 👍'd jobs had domain_fit < 50. Want to weight domain less for this target?"
[Adjust weights] [Dismiss]
```

Cheap to compute: per-target axis correlation with thumbs sign. **Defer until plan item #7 ships** — without feedback signal there's nothing to suggest.

### Why feedback survives weight changes cleanly

Feedback signals "is this job actually a fit for me", which is independent of "how was the score computed". The Phase 2 axis_scores (the raw signal) don't change when weights change — only the display_score does. So example pools keep evolving correctly; re-grading isn't needed when weights change.

### Sub-feature priority within PR E

1. **`user_targets.axis_weights` + read-time math** (1 day, backend) — the basic capability
2. **Pre-change preview + warning copy + undo** (1 day, frontend) — the safety net
3. **Feedback-driven weight suggestions** (deferred until plan item #7 lands)

### Acceptance criteria (PR E)

- Equal-quartile defaults produce display_score within ±2 of Sonnet's `fit_score` on the eval set.
- Adjusting weights produces immediate UI re-sort (no DB write needed for read).
- "Undo last change" reverts in one click.
- Settings page doesn't surface weights to users who haven't entered the Advanced section.

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
