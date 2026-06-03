# Implementation Plan: WyrdFold Job-Fit Feedback

Date: 2026-06-01
Scope: Surface "at-a-glance" job-fit feedback in the WyrdFold jobs UI, replacing
the bare 0–100 score with a decision-oriented verdict, actionable gap
classification, cross-pipeline gap intelligence, and list-row triage.

Builds on (and is complementary to) `research-wyrdfold-jd-highlight-overlay.md`.
The JD inline-highlight overlay is **out of scope** here; this plan is the
summary/verdict layer that sits above the JD.

---

## ⚠️ Status update — 2026-06-03 (post LLM-migration #4–#6)

**Worth pursuing: YES, but the backend half needs re-targeting.** The product
value (verdict, closeability, cross-pipeline gaps, list triage) holds. The
wiring assumptions don't.

What changed since 2026-06-01: PRs #790 (Phase 1 triage), #791/#793 (Phase 2
scaffold + scoring), #795 (Phase 2 poller wiring + recency decay) all landed.
When `PHASE2_ENABLED=true` the poller **replaces** the legacy Stage 3
LLM-blend path entirely (`poller.py:797` branches Phase 2 ↔ Stage 3, no
fall-through). New scoring writes to `scores.score / axis_scores /
fit_reasoning`, **not** `job_analyses.scorecard`. Verified:

- `analysis/persistence.py:18` still reads/writes `TABLE = "analyses"` (the
  legacy Stage 3 cache).
- Migration files only create `job_analyses` (`20260424120004…`,
  `20260428120000_add_target_id_…`). The pre-flight Q1 ambiguity (analyses vs
  job_analyses) **remains unresolved** — at least one of those names is wrong
  somewhere; this plan's Phase 3 aggregation will hit it.
- `models/analysis.py` `Scorecard.skills_missing` is still `list[str]`; no
  `verdict`, no `closeability`.

### What's obsolete

- **Phase 1 (this plan) — extending the Stage 2 `Scorecard` schema**: stops
  populating once `PHASE2_ENABLED=true`, because the analyse path it lives on
  no longer runs in the poll cycle. Every new job under an active target
  writes a Phase 2 `JobFitResult` row instead. The Stage 3 scorecard only
  back-fills for jobs the user opens manually (cache lookup), and even that's
  fading.
- **Phase 3 (this plan) — `/analysis/aggregated/missing-skills` over
  `job_analyses.scorecard`**: same problem — the source goes stale. The
  feature is right, the table is wrong.
- **Phase 5 list-row triage reading `verdict` off the latest analysis**: same
  source problem; un-analyzed rows would be the norm under Phase 2.

### What's still good

- **All Phase 2 (UI) work — `JobDetailPanel` restructure**: the verdict
  header, fit strip, grouped-gap layout, and chip presentation all stand.
  They just consume a different schema underneath.
- **Closeability taxonomy** (`resume_fixable | stretch | knockout`) and
  **verdict taxonomy** (`apply | stretch | skip`): orthogonal to where the
  data lives. Carry forward as-is.
- **Cross-pipeline aggregation** as a feature: still high-value; re-source.
- **Cached-row coercion validator approach**: still the right pattern for any
  schema evolution; reuse on the Phase 2 model.

### Re-target — recommended path

Put `verdict` + `MissingSkill[]` on **Phase 2's `JobFitResult`**, not on the
Stage 3 `Scorecard`. Cost is negligible: same Sonnet call, ~+200 output
tokens, same row write (`scores.fit_reasoning` + a new `scores.verdict` /
`scores.skills_missing` JSONB column or fold into `score_breakdown`). Then:

- **Backend Phase 1 (this plan)** moves to:
  `apps/wyrdfold-api/app/services/fit/job_fit.py` — extend `JobFitResult` and
  the system prompt with verdict + closeability. ~Half a day; mostly prompt
  work + a tiny migration.
- **Backend Phase 3 (this plan)** aggregates over `scores` rows for the
  active target, joining `jobs` on status. JSONB unnest stays the same shape;
  source table changes. No reliance on the ambiguous `analyses` /
  `job_analyses` naming. The migration plan's resolution for open question #3
  (per-target Phase 2 spend visibility) already established this scores-table
  query pattern.
- **Phase 3 (migration plan) — deep-dive Opus** later upgrades the same
  fields with richer reasoning; same schema, different model. No second
  re-target needed.

If we DON'T re-target: features ship against a sunset code path. Once
`PHASE2_ENABLED=true` flips, the UI goes blank on every new job.

### Suggested ordering

1. Resolve the `analyses` vs `job_analyses` naming (1 hr, blocking nothing
   but worth doing for hygiene — even legacy reads are broken if the name
   mismatch is real).
2. **Re-targeted Phase 1**: add `verdict` + `skills_missing: MissingSkill[]`
   to `JobFitResult`. Tiny migration for the new column(s) on `scores`.
3. **Frontend Phase 2 (this plan)**: `JobDetailPanel` consumes the new
   fields. Visible win.
4. **Re-targeted Phase 3**: aggregation endpoint over `scores`. Render the
   pipeline card.
5. **Phase 5 list triage**: `verdict` LEFT-JOINed onto the /jobs list
   payload from `scores`.

Total revised estimate: 2.5–3 days, slightly less than the original because
the Phase 2/Phase 3 split-of-output is no longer needed (Phase 2 emits
everything in one call).

The rest of the document below is the original 2026-06-01 plan, preserved as
context. Read the Phase 2 (frontend) sections as-is; read the backend
sections as architectural intent to be re-implemented per the re-target
notes above.

---

## Decisions (locked)

- **Verdict + gap closeability**: LLM-generated (extend the Stage 2 Scorecard
  tool schema). Not a client heuristic.
- **Cross-pipeline gaps**: backend aggregation endpoint, scoped to active-status
  jobs only (exclude `rejected`, `archived`, `offer`).
- **List-row triage**: verdict shown only on rows that already have a cached
  analysis; un-analyzed rows keep today's score badge.
- **Implementation happens in a git worktree** (per user instruction) to avoid
  colliding with actively-worked files on `develop`.

## Features in this batch

1. **Decision verdict** — structured `apply | stretch | skip` + reason, promoted
   to the top of `JobDetailPanel` and rendered as a list-row indicator.
2. **Gap closeability** — each missing skill classified
   `resume_fixable | stretch | knockout`, rendered as grouped chips.
3. **Cross-pipeline intelligence** — "Kubernetes is missing in 9 of 14 active
   jobs", aggregated server-side from `job_analyses.scorecard`.
4. **List triage** — verdict word + fit bar on analyzed rows in `JobsListTable`.

(Idea 4 "logistics knock-outs" and idea 6 "annotate the resume" are explicitly
deferred — noted in §Future.)

## Pre-flight verifications (do first, ~30 min)

- [ ] **Live analyses table name.** `persistence.py:18` uses `TABLE = "analyses"`
      but migration `20260424120004_create_job_analyses.sql` creates
      `job_analyses` (later `..._add_target_id_to_job_analyses.sql` adds
      `target_id`). Confirm whether a rename migration exists or `analyses` is a
      view. The aggregation query in Phase 3 depends on the real name.
- [ ] **`job_postings.status` is queryable alongside analyses** and how user
      scoping flows (`job_analyses.user_id` vs `user_targets` junction). The
      backfill/aggregation joins on this.
- [ ] **Backward-compat for cached rows.** Cache key is
      `(job_posting_id, target_id, optimized_doc_id)`; existing rows have the old
      scorecard shape with no `verdict` and `skills_missing: string[]`. New fields
      MUST validate against old rows (see Phase 1 coercion).

## Phase 1 — Backend: LLM schema + prompt (1 day)

Files:

- `apps/wyrdfold-api/app/models/analysis.py` (L14–35)
- `apps/wyrdfold-api/app/services/analysis/prompts.py`
- `apps/wyrdfold-api/app/services/analysis/persistence.py` (read/write shapes)

### 1a. Extend Pydantic models (backward-compatible)

```python
# models/analysis.py
Closeability = Literal["resume_fixable", "stretch", "knockout"]
Verdict = Literal["apply", "stretch", "skip"]

class MissingSkill(BaseModel):
    name: str
    closeability: Closeability = "stretch"

class Scorecard(BaseModel):
    skills_matched: list[SkillMatch]
    # Evolve string[] -> object[] with a validator that coerces LEGACY
    # cached rows (plain strings) so get_cached() still validates them.
    skills_missing: list[MissingSkill]
    nice_to_haves: list[str]
    seniority_fit: Literal["strong", "moderate", "weak"]
    seniority_rationale: str
    domain_fit: Literal["strong", "moderate", "weak"]
    domain_rationale: str

    @field_validator("skills_missing", mode="before")
    @classmethod
    def _coerce_legacy(cls, v):
        return [
            {"name": s, "closeability": "stretch"} if isinstance(s, str) else s
            for s in (v or [])
        ]

class JobAnalysis(BaseModel):
    scorecard: Scorecard
    recommendation: str
    verdict: Verdict | None = None   # nullable -> legacy rows validate
```

Why nullable `verdict` + coercing validator: the Anthropic tool schema is
generated from these models (`anthropic_client.py:127–176` /
`analyze.py:58 complete_json(schema=JobAnalysis)`), so new fields propagate to
the LLM automatically — but old cached rows read back through the same models and
must not throw.

### 1b. Prompt (`prompts.py` `ANALYSIS_SYSTEM`)

- Add a `VERDICT` section: `"apply"` (strong fit, clear yes), `"stretch"`
  (worth applying but real gaps), `"skip"` (don't bother). Keep `recommendation`
  as the one-sentence reason aligned to the verdict.
- Extend `SKILL MATCHING`: for each `skills_missing` entry emit a `closeability`:
  - `resume_fixable` — plausibly already done, just not surfaced (reword/retitle).
  - `stretch` — genuinely lacking but learnable / adjacent.
  - `knockout` — hard requirement the candidate cannot meet (e.g. "8+ years",
    a required clearance/credential). Be conservative; `knockout` is rare.

Cost: piggybacks the existing Stage 2 call, ~+150–400 output tokens (~$0.003–
0.006/job). No second call.

### 1c. Re-analysis strategy for cached rows

Old rows stay valid (verdict=null, gaps default to `stretch`). Verdict/closeability
populate naturally on the next analysis run per (job, target, optimized doc).
Optional one-shot backfill script (mirror
`apps/wyrdfold-api/scripts/backfill_user_scores.py`) to re-run analysis for
active-status jobs so the new UI isn't sparse on day one. Gate behind a flag;
respects the existing LLM budget guard.

## Phase 2 — Frontend: JobDetailPanel restructure (1–1.5 days)

File: `apps/wyrdfold/src/app/(app)/jobs/JobDetailPanel.tsx`,
types in `apps/wyrdfold/src/app/(app)/jobs/types.ts`.

### 2a. Types

```ts
export type Verdict = 'apply' | 'stretch' | 'skip';
export type Closeability = 'resume_fixable' | 'stretch' | 'knockout';
export interface MissingSkill {
  name: string;
  closeability: Closeability;
}
// Scorecard.skills_missing: MissingSkill[]  (handle legacy string[] in a mapper)
// JobAnalysis.verdict?: Verdict | undefined  (exactOptionalPropertyTypes!)
```

New style maps in `types.ts` next to `STATUS_DOT_CLASS`:
`VERDICT_BADGE_VARIANT` (apply→success, stretch→warning, skip→error) and
`CLOSEABILITY_LABEL/VARIANT`.

### 2b. Verdict header (top of panel)

Promote the verdict + `recommendation` sentence to a single prominent strip
ABOVE the two-column body (currently `recommendation` is buried in the right
column, `JobDetailPanel.tsx:469`). One line: `[Apply]  strong stack match…`.

### 2c. Fit strip (surface data we already have but drop)

- Render `seniority_rationale` / `domain_rationale` (today only the
  `strong/moderate/weak` badge shows — `JobDetailPanel.tsx:472–495`).
- Render `skills_matched` ("you bring…") alongside gaps — panel currently shows
  only `skills_missing` (L496–509), reading all-negative. Use
  `SkillMatch.evidence` as the `title=`/tooltip.

### 2d. Gaps grouped by closeability

Replace the flat red `skills_missing` badge row with three groups:
`Knock-outs` (error), `Stretch` (warning), `Resume-fixable` (info, with a hint
that the tailor flow can address them). Empty groups hidden.

## Phase 3 — Cross-pipeline gap aggregation (1 day)

### 3a. Backend endpoint

File: `apps/wyrdfold-api/app/routers/analysis.py` (router `prefix="/analysis"`,
L21–24). Add:

`GET /analysis/aggregated/missing-skills?target_id=...`

- Auth: `user_id` from JWT dependency (as existing routes).
- Query: latest `job_analyses` row per `job_posting_id` for `(user_id, target_id)`,
  joined to `job_postings` filtered to active statuses
  (`new, saved, resume_draft, resume_ready, applied, interviewing`).
- Unnest `scorecard->'skills_missing'`, count by skill name (case-insensitive),
  return `{ total_active_jobs: int, gaps: [{ name, count, closeability_mode }] }`
  sorted by count desc. Prefer a Postgres RPC / SQL function over N python loops
  (JSONB `jsonb_array_elements`). New Pydantic response model in `models/analysis.py`.
- Index check: `idx_job_analyses_user_job` exists; confirm it covers the join.

### 3b. Frontend

- API proxy route: `apps/wyrdfold/src/app/api/...` mirroring existing analysis
  proxy (via `proxy.ts`). Add `GET /api/analysis/aggregated/missing-skills`.
- Surface: a small "Across your pipeline" card on the jobs page (not per-row) —
  "Kubernetes — missing in 9 of 14 active jobs". Lives once at page level. Links
  each gap to a filtered view if cheap; otherwise static for v1.

## Phase 5 — List-row triage (0.5 day)

File: `apps/wyrdfold/src/app/(app)/jobs/JobsListTable.tsx` (score badge
`~L44–57`, rows `~L115–160`).

- Extend the `/jobs` list payload with the latest analysis `verdict` for the
  active target via LEFT JOIN (null when un-analyzed). Confirm the list query is
  target-scoped (it already shows a per-target blended score).
- Render: when `verdict` present, show the verdict dot/word; else keep today's
  bare score badge. Optional 3-segment fit bar (skills/seniority/domain) behind
  the same presence check. No eager analysis.

## Testing & verification

- Backend: pytest for the validator (legacy `string[]` coercion + new object
  shape), the aggregation SQL (fixture with mixed statuses — assert rejected/
  archived excluded), and the new endpoint (auth + empty-pipeline case).
- Frontend: Vitest/Jest for the verdict/closeability mappers and legacy-shape
  handling; RTL for the panel restructure (verdict strip, grouped gaps, matched
  skills); jest-axe on the new card/strip (contrast on success/warning/error
  surfaces — same WCAG caveat flagged in the highlight research doc).
- E2E (`apps/wyrdfold-e2e`): open a job → verdict strip renders; pipeline card
  shows counts. Auth via OTP/service-role per project convention.
- Gate: `pnpm tsc --noEmit` + `pnpm nx test root` (and wyrdfold project tests)
  before push. Branch off `develop` in a worktree; PR targets `develop`.

## Risks

- **Cached-row migration**: the validator is the single point that keeps old rows
  loading. Unit-test it first; if it throws, every cached job 500s.
- **Table-name ambiguity** (`analyses` vs `job_analyses`) — resolve in pre-flight
  or the aggregation query targets the wrong relation.
- **Verdict inflation**: LLM may over-use `apply`. Calibrate prompt; consider an
  offline eval on a handful of known jobs.
- **List payload cost**: the LEFT JOIN for verdict must not N+1 or balloon the
  list query — verify with EXPLAIN on a realistic row count.

## Future (not this batch)

- Idea 4: logistics knock-outs (salary/location/title) as a red-flag line —
  `salary_text`/`location` already on `JobPosting`.
- Idea 6: annotate the user's resume/target instead of the JD.
- The JD inline-highlight overlay (separate research doc), now best as a
  chip→JD "highlight on demand" reveal rather than always-on.
