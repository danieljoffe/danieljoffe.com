# Implementation Plan: Logistics Chips on Job Rows

**Author:** Claude (overnight session, 2026-06-02)
**Status:** Small UX/data PR. ~half-day to ~one-day total.

## Goal

Render location, salary, and a few high-signal "dealbreaker" cues (visa,
timezone, full-remote) as **informational inline chips** on every job row
and at the top of the detail panel.

**Do not** factor any of these into `score` or `recency_score`. They're
information surfaces, not ranking signals. (Rationale: see the discussion
under "Logistics: filters vs weights" in the conversation transcript; data
quality is too uneven to base ranking on these, and user intent on these
dimensions is binary, not weighted.)

## Why now

Once the scoring noise is gone (Phase 1 + Phase 2 + recency are live, see
the migration plan), the next bottleneck for "did I find what I want?" is
the user manually scanning rows for dealbreakers. Right now they see only
title / company / score / salary-text / location-string. The location and
salary strings are noisy and easy to miss; visa/timezone hints aren't
surfaced at all.

Chips reduce that scan time without polluting the score.

## What renders

Three chip families on each row (and prominently in the detail panel):

### 1. Location chip (always shown)

Normalize the raw `jobs.location` string into one of:

| Render           | Trigger                                                       |
| ---------------- | ------------------------------------------------------------- |
| `🌐 Remote`      | location contains "Remote" / "Anywhere" with no specific city |
| `🏠 Remote – US` | "Remote - US" / "Remote United States"                        |
| `🏢 Hybrid – SF` | "Hybrid" + first city, when a single city is named            |
| `🏢 SF, NYC, +3` | multiple cities listed (n>2 truncated)                        |
| `🌍 London, UK`  | single non-US city                                            |
| `📍 ?`           | location is blank or unparseable                              |

Pure presentation; no backend change. Component reads `jobs.location` and
runs a small normalizer.

### 2. Salary chip (always shown)

| Render             | Trigger                               |
| ------------------ | ------------------------------------- |
| `💰 $260k – $350k` | salary_text parses into a range       |
| `💰 $200k+`        | salary_text parses with only a floor  |
| `💰 $200k`         | salary_text is a single value         |
| (no chip)          | `salary_text` is empty or unparseable |

Two states: shown when parseable, omitted entirely when not. Avoid
rendering "not disclosed" as a chip — too noisy at the row level.

Use the existing `extract_salary_from_text` (backend) for the parse; expose
the parsed range as a small client utility too so the chip can render
without a round-trip.

### 3. Logistics flag chips (when applicable)

Small backend extractor (`app/services/logistics.py`) that scans
`description_html` for high-signal cues, persisted on the row:

| Cue                   | Trigger phrases (case-insensitive, word-boundary)                                | Chip                     |
| --------------------- | -------------------------------------------------------------------------------- | ------------------------ |
| `visa.no`             | "no visa sponsorship", "not provide visa", "do not sponsor", "unable to sponsor" | `🛂 No visa`             |
| `visa.yes`            | "visa sponsorship available", "we sponsor", "happy to sponsor"                   | `🛂 Sponsors visa`       |
| `timezone.us`         | "US time zone", "PST", "EST hours", "must overlap US", "Americas time zone"      | `🕐 US hours`            |
| `timezone.eu`         | "European time zone", "GMT", "CET hours", "EU hours"                             | `🕐 EU hours`            |
| `onsite`              | "must be in office", "fully on-site", "no remote", "in-office requirement"       | `🏢 On-site only`        |
| `relocation.required` | "willing to relocate", "relocation required"                                     | `📦 Relocation required` |
| `clearance.required`  | "security clearance", "TS/SCI", "secret clearance"                               | `🛡️ Clearance required`  |

Conservative matching: short, specific phrases only. Better to miss a cue
than to false-positive on a casual mention.

A row may have multiple flag chips; truncate to first 2 on the list view
(`+N more` overflow), show all in the detail panel.

## Backend changes

### Migration

```sql
-- 20260603160000_jobs_logistics_jsonb.sql

alter table public.jobs
  add column if not exists logistics jsonb default '{}'::jsonb;

comment on column public.jobs.logistics is
  'Parsed logistics cues for chip rendering: {visa: "yes"|"no"|null, '
  'timezone: "us"|"eu"|null, onsite: bool, relocation: bool, clearance: bool}. '
  'Populated by app/services/logistics.py on ingestion + by a one-time '
  'backfill script. Informational only — NOT used in scoring.';

-- No backfill in the migration itself; see scripts/backfill_logistics.py.
```

### Extractor module

```python
# apps/wyrdfold-api/app/services/logistics.py
"""Parse high-signal logistics cues from a job's description HTML.

Populated by the poller at ingestion and by a one-time backfill script.
Designed to be conservative — better to miss a cue than to false-positive
on a casual mention.

The result powers the logistics chips on the /jobs list and detail panel.
It is NOT used in scoring; see plan-wyrdfold-logistics-chips.md.
"""

from __future__ import annotations
import re
from typing import Literal, TypedDict
from app.services.scoring import strip_html

class JobLogistics(TypedDict):
    visa: Literal["yes", "no"] | None
    timezone: Literal["us", "eu"] | None
    onsite: bool
    relocation: bool
    clearance: bool

# patterns as a const dict so they're testable in isolation
_PATTERNS: dict[str, list[str]] = {
    "visa.no": [r"\bno visa sponsorship\b", r"\b(do |will )?not sponsor\b", r"\bunable to sponsor\b"],
    "visa.yes": [r"\bvisa sponsorship (available|provided|offered)\b", r"\bwe (will )?sponsor\b", r"\bhappy to sponsor\b"],
    "timezone.us": [r"\bUS time ?zone\b", r"\bPST hours\b", r"\bEST hours\b", r"\bmust overlap US\b", r"\bAmericas time ?zone\b"],
    "timezone.eu": [r"\bEuropean time ?zone\b", r"\bGMT hours\b", r"\bCET hours\b", r"\bEU hours\b"],
    "onsite": [r"\bmust be in (the )?office\b", r"\bfully on[- ]site\b", r"\bno remote\b", r"\bin[- ]office requirement\b"],
    "relocation.required": [r"\brelocation required\b", r"\bwilling to relocate\b"],
    "clearance.required": [r"\bsecurity clearance\b", r"\bTS/SCI\b", r"\bsecret clearance\b"],
}

_COMPILED = {k: [re.compile(p, re.IGNORECASE) for p in pats] for k, pats in _PATTERNS.items()}

def extract_logistics(description_html: str) -> JobLogistics:
    text = strip_html(description_html or "")
    def hit(key: str) -> bool:
        return any(p.search(text) for p in _COMPILED[key])
    visa: Literal["yes", "no"] | None = (
        "no" if hit("visa.no") else "yes" if hit("visa.yes") else None
    )
    tz: Literal["us", "eu"] | None = (
        "us" if hit("timezone.us") else "eu" if hit("timezone.eu") else None
    )
    return {
        "visa": visa,
        "timezone": tz,
        "onsite": hit("onsite"),
        "relocation": hit("relocation.required"),
        "clearance": hit("clearance.required"),
    }
```

### Poller integration

In `app/services/poller.py`, in the row-build loop (around the upsert), add
`"logistics": extract_logistics(job.content)` to each
`rows_to_upsert` entry. One-line change.

### Backfill script

`scripts/backfill_logistics.py` — iterate `jobs` where `logistics = '{}'`,
parse, write back. Paginated, idempotent, ~free (no LLM).

### API surface

`/jobs` response already returns the full job row. Add `logistics` to the
default select list in `apps/wyrdfold-api/app/routers/jobs.py` (per the
two-query and across-targets paths) so the frontend can render without a
second round-trip.

## Frontend changes

### New component

`apps/wyrdfold/src/components/JobLogisticsChips.tsx` — pure component that
takes `{ location, salaryText, logistics }` props and renders the chip row.
Two variants:

- `compact` (default) — first 2 flag chips + `+N` overflow; used in `JobsListTable`.
- `full` — all chips; used in `JobDetailPanel` header.

Reuse the existing chip primitive from `@danieljoffe.com/shared-ui` if one
exists (`Badge`, `Chip`); otherwise build a thin local one.

Pure presentation, no hooks; works in server + client contexts.

### Types

```ts
// apps/wyrdfold/src/app/(app)/jobs/types.ts
export interface JobLogistics {
  visa: 'yes' | 'no' | null;
  timezone: 'us' | 'eu' | null;
  onsite: boolean;
  relocation: boolean;
  clearance: boolean;
}
// Add to existing JobRow:
//   logistics?: JobLogistics | undefined;
```

### List integration

In `apps/wyrdfold/src/app/(app)/jobs/JobsListTable.tsx`, add the chip row
below the title cell. Hide if no chips would render (all fields null/false).

### Detail panel integration

In `apps/wyrdfold/src/app/(app)/jobs/JobDetailPanel.tsx`, add a `<JobLogisticsChips variant="full" />` row directly under the title block. Visible regardless of fit-score state.

## Tests

- **Backend unit**: `tests/test_logistics.py` — happy paths for each cue + confirm conservative matching (no false-positives on "visa-related questions during interviews" or "team works across timezones").
- **Backend integration**: poller writes `logistics` on new rows; backfill is idempotent.
- **Frontend unit**: `JobLogisticsChips.test.tsx` — renders correct chip for each input combination; compact-vs-full variants; renders nothing when everything is null/empty.
- **Frontend RTL**: list row shows chips; detail panel header shows chips.

## What's deliberately out of scope

- **Scoring**: chips never affect `score`, `recency_score`, or sort order.
- **User filters**: this PR is information surfacing only. A follow-up could add filter pills like "Sponsors visa" / "Remote only" wired to query params — but that's a separate UX PR. (And the right place to add `salary_floor` and `remote_preference` as user-level defaults; see streamlined-target plan for the data shape.)
- **Salary normalization across currencies**: today we render `salary_text` as-is; multi-currency comparison is a separate problem.
- **Detecting "remote in X country only"**: too noisy to extract reliably; leave to user filters.

## Acceptance criteria

- Every `/jobs` row renders a location chip and (when parseable) a salary chip.
- Backend extractor is conservative (a target false-positive rate <2% on a 50-row spot-check audit).
- Logistics chip in the detail panel surfaces all extracted cues.
- Zero changes to `score`, `recency_score`, or list sort order.
- Backfill script populates `logistics` on all existing rows.
- Wyrdfold tests green; Lighthouse score unchanged on the /jobs page.

## Estimated work

- Backend extractor + tests: 2 hours.
- Migration + poller wiring + API response: 1 hour.
- Backfill script: 30 min.
- Frontend component + types + integration: 2-3 hours.
- E2E + Storybook story + a11y check: 1 hour.

Total: half day to one full day depending on shared-ui chip primitive availability.

## Connection to other plans

- **Streamlined target creation** (plan-wyrdfold-streamlined-target.md): the slim target shape can later add user-level `salary_floor` and `location_preferences` as filter defaults. These chips would gain a "matched"/"mismatched" visual state in that follow-up.
- **Relevance diagnosis** (plan-wyrdfold-relevance-diagnosis.md): orthogonal; chips don't touch scoring so no regression risk.
- **Phase 3 deep dive** (migration plan #8): when shipped, the verdict (apply/stretch/skip) will fold logistics into the recommendation. Chips become the at-a-glance signal; verdict becomes the considered take.
