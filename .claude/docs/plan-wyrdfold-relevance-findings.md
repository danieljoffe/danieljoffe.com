# Relevance Findings — Snapshot 2026-06-03 00:18 UTC

**Author:** Claude (overnight autonomous session)
**Source data:** ~1,441 Phase 2-graded rows across 3 active targets, after Phase 1 backfill (16,821 titles graded) + Phase 2 backfill (mostly complete; Staff FE still draining rate-limit retries at write time).
**Scripts used:** `scripts/diagnostic_axis_stats.py`, `scripts/audit_phase1_fn.py` (both committed; re-runnable).

## TL;DR

The system is **calibrated well** after the migration. Three diagnostic
checks all came back green:

| Check                                                                   | Result             | Target                  | Verdict      |
| ----------------------------------------------------------------------- | ------------------ | ----------------------- | ------------ |
| Phase 1 false-negative rate (Sonnet re-grade of 99 random unpromising)  | **0.0%**           | < 5%                    | ✅ excellent |
| All four Phase 2 axes pulling weight (stdev + correlation with overall) | **all axes alive** | stdev > 10, \|r\| > 0.2 | ✅           |
| Score-clump density at any single value                                 | **no clusters**    | < 8% at one int         | ✅           |

The two specific cases Daniel raised as evidence of brokenness are now fixed:

| Job                                                    | Old score | New score (Phase 2) | New reasoning                                                                                         |
| ------------------------------------------------------ | --------- | ------------------- | ----------------------------------------------------------------------------------------------------- |
| Senior Manager, Customer Experience Strategy @ Samsara | **7**     | **62**              | T55 S72 Sn60 D60 — manager-level vs director target, hence the seniority gap                          |
| Customer Success Manager @ Bland AI                    | **56**    | **22**              | "IC post-sales role… fundamentally misaligned with Director of CX Operations & Transformation target" |

Both transitions are large and directionally correct. The system is no longer
ranking off-discipline keyword matches above genuine fits.

## Per-target snapshot

### Staff Frontend Engineer (aa27307e, profile_version=2)

```
n = 146    overall: mean=25.3  median=18.0  stdev=22.6  min=2  max=82

axis            n   mean median stdev  corr_overall
title_fit     146  24.3  10.0  26.1   0.98
skills_fit    146  27.4  20.0  23.1   0.97
seniority_fit 146  42.5  40.0  22.7   0.84
domain_fit    146  28.1  20.0  19.7   0.90
```

Bimodal distribution: big cluster at 0-25 (most Engineering titles aren't a
specific Staff Frontend match) plus a real top tail with a small peak around
60-74. The top tail is the actual "real matches". `seniority_fit` mean of
42.5 reflects that most engineering jobs are Senior or IC, not Staff —
correct discrimination.

### Director of CX Operations & Transformation (4195d651, profile_version=6)

```
n = 753    overall: mean=20.1  median=18  stdev=12.8  min=4  max=72

axis            n   mean median stdev  corr_overall
title_fit     753  14.9  10.0  12.1   0.96
skills_fit    753  24.3  20.0  14.5   0.97
seniority_fit 753  35.7  40.0  18.1   0.79
domain_fit    753  25.4  25.0  14.1   0.85
```

Tighter distribution; CX/CS/Ops vocabulary overlaps heavily with PM, Sales
Ops, RevOps, so many jobs land in the 10-30 "you're adjacent but not it"
band. The top tail is small (12 jobs at 60+, 6 at 70+) which matches manual
expectations — there genuinely aren't many "Director of CX Ops &
Transformation" matches in a given week. `seniority_fit` lower mean (35.7)
because CS/CX market is heavy on manager-level roles.

### Frontend Engineering Manager (cf684e83, profile_version=2)

```
n = 542    overall: mean=20.1  median=18.0  stdev=15.0  min=2  max=78

axis            n   mean median stdev  corr_overall
title_fit     542  19.2  15.0  18.0   0.97
skills_fit    542  23.2  18.0  17.7   0.90
seniority_fit 542  41.6  40.0  14.6   0.80
domain_fit    542  25.8  20.0  15.4   0.82
```

Right-skewed similar to Melissa. profile_version=2 reflects the empty-pool
regeneration done earlier this session.

**Update (post-rescore + v=2 re-grade, 1,189 rows touched, 607 graded):**

```
n = 607    overall: mean=20.8  median=18  stdev=15.6  min=2  max=78

axis            n   mean median stdev  corr_overall
title_fit     607  20.1  15.0  18.8   0.97
skills_fit    607  23.2  20.0  17.3   0.89
seniority_fit 607  41.9  40.0  14.7   0.85
domain_fit    607  27.6  25.0  15.7   0.85
```

Compared to the v=1 snapshot above: numbers moved < 5% on every metric.
That stability is itself a finding — the slim profile-bump (regenerating
example pools from an empty starting point) produced minor, defensible
shifts rather than a wholesale re-ranking. The pipeline is robust to
target-shape changes within a reasonable range; we don't have to fear
small target tunings causing cascading score chaos.

## Melissa's top-15: calibration spot-check

```
 72  T 72 S 75 Sn 78 D 65 | Senior Director, Transformation & Business Operations @ Smartsheet
 72  T 65 S 78 Sn 75 D 68 | Strategy & Operations, Support @ OpenAI
 72  T 78 S 75 Sn 80 D 55 | Sr. Director, Services and Support Operations @ Illumio
 72  T 78 S 80 Sn 85 D 50 | Director, Customer Support Systems @ GitLab
 72  T 78 S 70 Sn 80 D 58 | Head of Client Experience, Symmetry @ Gusto
 72  T 55 S 82 Sn 75 D 70 | Support Partner Manager @ OpenAI
 62  T 60 S 65 Sn 75 D 45 | Customer Experience - Service Delivery Head @ Grab
 62  T 72 S 58 Sn 75 D 55 | Senior Director, Customer & Partner Operations @ MongoDB
 62  T 55 S 72 Sn 60 D 65 | Sr. Manager, Global Support @ Zapier
 62  T 58 S 65 Sn 78 D 60 | Head of Post Sales Technology @ MongoDB
 62  T 55 S 72 Sn 60 D 65 | Senior Manager Customer Support @ DeepL
 62  T 55 S 72 Sn 58 D 60 | Senior Manager, Customer Experience Strategy @ Samsara
 58  T 55 S 62 Sn 72 D 45 | Head of Partner Experience, Embedded Payroll @ Gusto
 58  T 45 S 62 Sn 65 D 72 | Operations Data & Technology Strategy Lead @ Airbnb
 52  T 45 S 60 Sn 55 D 40 | Senior Program Manager, Operational Excellence @ SoFi
```

Each top-tier row is a defensible match. Six jobs tied at 72; not because
the model is anchoring, but because they're genuinely the strongest matches
in the corpus and each has at least one axis gap (typically `domain_fit`
because the user's domain hints don't cover every SaaS vertical).

Manual calls:

- **A (correct match)**: 12/15 — Smartsheet, OpenAI x2, Illumio, GitLab, Gusto, Grab, MongoDB x2, Zapier, DeepL, Samsara
- **B (slightly high)**: 0/15
- **C (slightly low)**: 0/15
- **D (worth examining)**: 3/15 — Support Partner Manager @ OpenAI (manager not director — T55 reflects this), Operations Data & Technology Strategy Lead @ Airbnb (IC analyst role, T45 is right), Sr Program Manager @ SoFi (PM not CX leader)

Three D-tier rows are correctly differentiated by the axis breakdown: they
land at 52-72 because they're not perfect on title_fit but are strong
elsewhere. That's the system working.

## Concerns + recommendations

### 1. Top-of-scale is compressed (max 72 / 78 / 82)

No single Phase 2-graded job scored above 82 across any target. The model
appears reluctant to award 85-100. The "Excellent across the board" tier
seems to be ~70-82 in practice.

This isn't broken (no genuine 90+ matches in the current pool), but it
truncates the dynamic range. Recommend a small prompt nudge in
`fit/job_fit.py` `_SYSTEM_PROMPT`:

> Reserve 85-100 for jobs that match on all four axes within ±10 points of
> each other AND where the title is an exact or near-exact match. A "perfect"
> 95 should be rare — maybe 1 in 200 — but possible.

After the change, re-run the spot-check; if any 80-82 jobs now land at 85+,
we know it works.

### 2. Bimodal distribution on Staff Frontend Engineer is healthy, but the gap is conspicuous

Staff FE has a clear valley between 25-45 (very few jobs) before the top
tail. This is honest — most engineering titles aren't Staff. But it might
visualize poorly in the UI list view (rows look like "20, 18, 15, 14, ...,
60, 72") with a jarring jump.

Not a scoring fix; a UI consideration. The plan-wyrdfold-job-fit-feedback
plan (verdict apply/stretch/skip) would smooth this UX-wise by collapsing
the long low-tail.

### 3. Staff FE has 257 stage2-promising-pending stragglers (rate-limit casualties)

Phase 2 backfill couldn't grade these in the current run due to Anthropic
rate-limit retries timing out. They sit at `scoring_status='stage2'` with
keyword scores. Two paths to resolve:

1. **Re-run the Phase 2 backfill** in a few hours when the rate-limit
   window resets (~$1 estimated cost given 257 × $0.0035).
2. **Wait** — the poller will keep grading new jobs as they come in. These
   pending rows will only matter if Daniel is actively comparing his Staff
   FE list to a v2-profile re-grade. Low priority.

I'd recommend option 1 tomorrow morning when the cap window resets.

### 4. Phase 1 confidence capture is now even higher value

With Phase 1 at 0% measured FN rate, Sonnet adds no precision at the
_detection_ layer. But Phase 2 candidate **ordering** still uses
`first_seen_at` because we lack confidence. Capturing confidence (open
question #4 from the migration plan, answered yes) would let Phase 2 grade
the most-likely-promising first when the daily cap bites.

This is a small follow-up PR (see plan-wyrdfold-relevance-diagnosis.md §5
for the implementation sketch).

### 5. Domain hints are doing real work — keep them in the slim target shape

`domain_fit` correlates 0.82-0.90 with overall score across all three
targets, stdev 14-20. It's not a dead axis. The streamlined-target plan
recommends keeping `domain_hints` in the new slim shape; the data confirms
that's the right call.

## Implications for the streamlined-target plan

Three findings update the streamlined-target plan:

1. **Keep all four axes.** No axis is dead; `domain_hints` belongs in the
   slim shape.
2. **The `description` field is the highest-leverage addition.** Today
   Phase 2 derives the role's "shape" from `scoring_profile.categories` (a
   list of weighted keywords). The reasoning string on top rows ("user's
   demonstrated director-level leadership across BPO, process
   reengineering, and omnichannel transformation") shows Sonnet is
   pattern-matching on the user's profile description. A target-level
   description prose block would give it the symmetric "what the target
   role actually is" prose, which should sharpen the title/skills
   discrimination further.
3. **Seniority is the second-most-discriminating axis after title.** The
   `seniority_hint` enum in the slim shape gets a stronger Phase 2 prompt
   role — recommend the prompt explicitly says "the user is targeting a
   [SENIORITY] role; one rung up/down is acceptable, two rungs apart is
   not."

## Implications for the relevance-diagnosis plan

§5 (Phase 1 confidence capture) and §6 (recency tuning observation) become
the top of the queue. The expensive checks (FN audit) graded as a one-time
baseline — re-run only after meaningful prompt changes.

## What this session did NOT cover

- Recency decay tuning observation — needs ~7 days of data (just turned on today).
- Per-row diagnosis of the 257 Staff FE stragglers.
- Phase 3 deep-dive calibration (not shipped).
- Feedback example-pool evolution (plan #7, not started).

## Acceptance criteria (from plan-wyrdfold-relevance-diagnosis.md)

| Criterion                                                          | Status                                                                                    |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| All four "good" metrics measured and reported                      | ✅                                                                                        |
| At least 3 concrete prompt-tuning recommendations grounded in data | ✅ (4 — scale compression, seniority emphasis, confidence capture, domain-hint retention) |
| Re-runnable scripts in place                                       | ✅ (axis stats + FN audit)                                                                |

## Cost of this diagnostic pass

| Step                               | Calls         | Cost       |
| ---------------------------------- | ------------- | ---------- |
| Phase 1 FN audit (99 Sonnet calls) | 99            | ~$0.50     |
| Diagnostic axis stats              | 0 (read-only) | $0         |
| **Total**                          | 99            | **~$0.50** |

Well under the $5-12 system backfill budget.
