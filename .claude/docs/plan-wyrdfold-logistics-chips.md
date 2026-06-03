# Implementation Plan: Logistics Chips on Job Rows

**Author:** Claude (2026-06-02; pivoted 2026-06-03 to Phase-2-piggyback extraction)
**Status:** Small-to-medium PR. Prompt + schema + FE component. Half-day to one day.

## Goal

Render high-signal **logistics** (remote vs onsite, salary range, location) as inline chips on every job row and prominently in the detail panel.

The chips never affect `score`, `recency_score`, or sort order. They are **filters and informational surfaces**, not ranking signals.

See also: the "Concepts" block in `plan-wyrdfold-streamlined-target.md`. **Axis weights** tune the displayed score. **Logistics filters** drop or surface rows based on hard criteria. They are independent mechanisms and never collide in code.

## Why now

The scoring pipeline (Phase 1 + Phase 2 + recency) is the primary noise reducer. The remaining bottleneck for "did I find what I want?" is the user scanning rows for dealbreakers — "is this remote?", "is the pay in the band?", "is it in my country?". Today the only signal is the noisy free-text `jobs.location` and `jobs.salary_text`. Chips fix that.

## Approach: piggyback on Phase 2 grading

Phase 2 (Sonnet) already reads the full JD body to produce axis scores. Adding a small `logistics_filters` JSON section to the same prompt costs near-zero tokens, avoids a separate extraction pipeline, and produces higher-quality output than regex.

Specifically:

- **No new model call.** One prompt change, one JSON section added to the schema. Same Sonnet pass.
- **No separate extractor service.** The Phase 2 grader writes the structured data alongside the axis scores.
- **No `jobs.logistics` column.** The data lives on `scores.logistics_filters jsonb`, alongside the axis scores it was extracted with. (Conceptually: this is "what the grader observed about this job", same lifetime as the score itself.)
- **Backfill via the existing Phase 2 backfill scripts** — no new tooling.

### What we extract (v1)

```json
{
  "remote_status": "remote" | "hybrid" | "onsite" | "unspecified",
  "salary_min": 150000,
  "salary_max": 180000,
  "salary_currency": "USD",
  "salary_unit": "year" | "hour",
  "location_city": "San Francisco" | null,
  "location_country": "US" | null
}
```

All fields nullable. The grader emits `"unspecified"` / null when the JD is ambiguous — far better than a regex's silent miss or false positive.

### What we deliberately don't extract (v1)

- **Visa sponsorship**: most JDs don't say. The LLM would have to guess from boilerplate. Out of scope until we have a more reliable signal (e.g. company-level metadata).
- **Timezone**: noisy and overlapping with `remote_status`. Defer.
- **Security clearance / relocation / on-site-only requirement**: low-signal long tail. Add later if user feedback demands.

Keep the v1 schema small. Adding fields later is cheap; removing them is not.

## Backend changes

### Migration

```sql
-- 20260603160000_scores_logistics_filters.sql

alter table public.scores
  add column if not exists logistics_filters jsonb;

comment on column public.scores.logistics_filters is
  'Structured logistics fields extracted by the Phase 2 grader: '
  '{remote_status, salary_min, salary_max, salary_currency, salary_unit, '
  'location_city, location_country}. Powers logistics chips and filter '
  'query params on /jobs. Informational / filtering only — NOT used in scoring.';
```

No backfill in the migration. Existing Phase 2 backfill script picks up the new column on its next pass (set `LOGISTICS_EXTRACTION_ENABLED=true`).

### Prompt change (`app/services/fit/job_fit.py`)

Add a new section to the Sonnet schema. The grader already returns axis scores + score breakdown; add `logistics` as a sibling object. Update the JSON schema validator, the Pydantic model, and the system prompt with extraction guidance:

> For `logistics.remote_status`: pick `"remote"` if the JD allows full-remote with no office requirement; `"hybrid"` if any in-office days are required; `"onsite"` if no remote work is permitted; `"unspecified"` if the JD is ambiguous. Lean `"unspecified"` over guessing.
>
> For `logistics.salary_min` / `salary_max`: extract numeric values only when explicit ("$150,000–$180,000"). Convert "150K" to 150000. `currency` is the ISO 4217 code ("USD", "EUR"). `unit` is `"year"` for annual figures, `"hour"` for hourly. Null all fields if no salary is disclosed.
>
> For `logistics.location_city` / `location_country`: extract the primary office city / country when named ("San Francisco" / "US"). Null when remote-only with no anchor location.

### API surface

`/jobs` already returns the `scores` join. Add `logistics_filters` to the SELECT list in `apps/wyrdfold-api/app/routers/jobs.py` (both `_list_jobs_for_target_two_query` and `_list_jobs_across_user_targets`).

New optional query params on `/jobs`:

| Param         | Behaviour                                                                   |
| ------------- | --------------------------------------------------------------------------- |
| `remote_only` | `true` → drop rows where `logistics_filters.remote_status != "remote"`      |
| `min_salary`  | int → drop rows where `salary_max` is null or `< min_salary` (USD assumed)  |
| `country`     | string ISO code → drop rows where `location_country` != value (null passes) |

Filters apply post-fetch (same pattern as the existing location text filter), so they compose with the existing min-score / status / company filters.

## Frontend changes

### Types

```ts
// apps/wyrdfold/src/app/(app)/jobs/types.ts
export interface LogisticsFilters {
  remote_status: 'remote' | 'hybrid' | 'onsite' | 'unspecified';
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_unit: 'year' | 'hour' | null;
  location_city: string | null;
  location_country: string | null;
}
// On the existing JobRow:
//   logistics_filters?: LogisticsFilters | null;
```

### `LogisticsChips` component

`apps/wyrdfold/src/components/LogisticsChips.tsx` — pure component taking `{ filters }`. Renders:

- **Remote chip** (always when known): `Remote` / `Hybrid` / `On-site`. Omit when `unspecified`.
- **Salary chip** (when both min and max present): formatted range with currency. Falls back to "$150k+" for floor-only.
- **Location chip** (when present): `City, CC` (e.g. `San Francisco, US`). Skip when remote-only with no anchor.

Two variants:

- `compact` (list rows) — chips inline below the title cell.
- `full` (detail panel) — chips in a dedicated header row.

Pure presentation, no hooks. Use the existing `Badge` primitive from `@danieljoffe.com/shared-ui`.

### Filter pills above `JobsListTable`

Three filter controls above the list, wired to the new query params:

- "Remote only" toggle → `remote_only=true`
- Salary slider (50k–500k step 10k) → `min_salary={value}`
- Country selector (auto-populated from the visible rows' `location_country`) → `country={code}`

Pills update the URL query string so filter state survives reload + share.

### Detail panel integration

In `apps/wyrdfold/src/app/(app)/jobs/JobDetailPanel.tsx`, add `<LogisticsChips variant="full" filters={job.logistics_filters} />` directly under the title block. Visible regardless of fit-score state.

## Tests

- **Backend unit**: `tests/test_logistics_extraction.py` — Phase 2 grader writes `logistics_filters` correctly given canned JDs; missing data → null fields; "150K" → 150000; hybrid keywords distinguishable from full-remote.
- **Backend integration**: `/jobs?remote_only=true` filters; `min_salary` filters; `country` filters; combined filters compose.
- **Frontend unit**: `LogisticsChips.spec.tsx` — renders correct chip per filters object; omits sensibly when data is null; compact vs full variants.
- **Frontend RTL**: list row renders chips; filter pills update URL params and re-fetch; detail panel header shows chips.

## What's deliberately out of scope (v1)

- **Visa sponsorship, timezone, clearance, relocation chips** — see "What we deliberately don't extract" above.
- **Multi-currency salary comparison** — render raw with currency code; let users mentally convert until we have demand for a comparison view.
- **User-level filter defaults** ("always show remote only") — keep filters URL-state for v1; persist to `user_profiles` in a follow-up.
- **"Remote in X country only" detection** — too noisy to extract; covered loosely by `location_country` + `remote_status` together.
- **Sort by salary** — v1 sort stays score / recency.

## Acceptance criteria

- Phase 2 grader populates `scores.logistics_filters` on all newly-graded jobs.
- Backfill script populates the column on all historical Phase-2-graded scores.
- `/jobs` returns `logistics_filters` on every row.
- `/jobs?remote_only=true`, `?min_salary=150000`, `?country=US` filter as expected.
- List rows render the chips compactly; detail panel renders them fully.
- Filter pills above the list survive page reload via URL state.
- Zero changes to `score`, `recency_score`, sort order, or any user-target axis-weights behaviour.
- Wyrdfold + wyrdfold-api tests green.

## Estimated work

- Prompt + Pydantic model + grader test: 1-2 hours.
- Migration + API SELECT + filter params + tests: 2 hours.
- Backfill rerun against prod: ~free, automatic.
- Frontend types + chip component + tests: 2 hours.
- Filter pills above list (URL state + re-fetch): 2 hours.
- E2E + visual regression: 1 hour.

Total: ~one day.

## Connection to other plans

- **Streamlined target creation** (`plan-wyrdfold-streamlined-target.md`): the slim target shape can later add user-level `salary_floor` and `location_preferences` as filter defaults that pre-populate the pills.
- **Relevance diagnosis** (`plan-wyrdfold-relevance-diagnosis.md`): orthogonal; chips don't touch scoring so no regression risk to the axes.
- **Phase 3 deep dive** (migration plan #8): when shipped, the verdict (apply / stretch / skip) folds logistics into the recommendation. Chips remain the at-a-glance signal; verdict becomes the considered take.
