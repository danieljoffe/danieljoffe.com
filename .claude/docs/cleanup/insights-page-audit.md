# Insights Page Audit — 2026-04-30

## Summary

The Fitted Insights page is well-architected with clear separation of concerns (frontend → proxy → FastAPI backend). The dashboard displays 6 charts across pipeline, target, and cost metrics, with skeleton loading states and basic error handling. There are accessibility gaps (focus management, keyboard navigation in charts), missing data-freshness indicators, incomplete validation in the proxy layer, and several optimization opportunities (memoization, query efficiency, cost-logging consistency).

**Status (2026-04-30):** all six HIGH items shipped, six MED items shipped, and all eight LOW items shipped — see annotations below. The remaining open work is the product-gap section (drill-downs, comparative periods, exports, skill-gap prioritization, pre-computed insights).

---

## High-priority issues

- **[HIGH][FIXED] Accessibility** — KPI grid was `role='status'` without `aria-live`. Now `role='status'` + `aria-live='polite'` + `aria-busy` toggling on the skeleton-vs-data branch (`InsightsDashboard.tsx`). Each chart card also gets `aria-busy` while its source endpoint is loading.

- **[HIGH][FIXED] Performance** — `useInsights()` now wraps its return in `useMemo` keyed on the underlying state object + a stable `refresh` callback, so consumers don't refetch on parent re-renders. `loading` is exposed as a per-endpoint flag bag (`{pipeline, targets, skillsCost, any, all}`).

- **[HIGH][FIXED] Accessibility** — All six charts now wrap their Recharts visual in `ChartFigure` (`apps/root/src/app/fitted/(app)/insights/charts/ChartFigure.tsx`): a `<figure>` with `aria-label`, the visual marked `aria-hidden`, and an `sr-only <table>` of the underlying data. SR users get the full numbers; sighted users get the chart unchanged.

- **[HIGH][FIXED] Data model / API** — `useInsights` now tracks `pipelineLoading / targetsLoading / skillsCostLoading` independently. Each endpoint flips its own loading flag on settle, so a slow targets fetch can't hide the pipeline KPIs that already arrived.

- **[HIGH][FIXED] Product gap** — Toolbar above the dashboard now shows a freshness badge ("Updated just now / N minutes ago") plus a Refresh button that bumps a tick to re-trigger `useInsights`. Stale data is kept visible during refresh so the screen doesn't go blank.

- **[HIGH][FIXED] Backend** — Each of the three `/api/jobs/insights/*` routes now calls `validatePeriod(request)` before forwarding, rejecting unknown values with `{ error, code: 'invalid_period' }` at status 400. Backend reachability errors stay as 503 from `proxy.ts`, so the UI can distinguish the two.

---

## Medium-priority issues

- **[MED][FIXED] Accessibility** — PeriodFilter now exposes a visible "Period" caption with `aria-labelledby` pointing at it, replacing the prior `aria-label`.

- **[MED][FIXED] Performance** — Date and currency formatters moved to `apps/root/src/app/fitted/(app)/insights/charts/format.ts` with module-scope `Intl.DateTimeFormat` / `Intl.NumberFormat` instances reused across ticks.

- **[MED][FIXED] UX** — KPI skeleton replaced with a `<KpiSkeleton>` that mirrors `StatsCard`'s structure (same `p-6`, caption, value rows) so swapping skeleton → data no longer shifts layout.

- **[MED][FIXED] DB** — `compute_pipeline` filters `job_status_log` by `created_at` only (the per-posting grouping happens in Python). Added `idx_job_status_log_created_at(created_at DESC)` in `20260430120003_add_insights_query_indexes.sql`. `idx_llm_cost_log_created_at` already existed in the original create migration — no change needed.

- **[MED] Code quality** — `formatPct()` / `formatDays()` already typed `(value: number | null) => string`. Closing this finding as already correct.

- **[MED][FIXED] UX** — Error banner now reports `'Some insights data failed to load: Pipeline, Targets'` (or similar), pulled from `failedEndpoints` on the hook's return. Banner also gets `role='alert'` for SR announcement.

- **[MED][FIXED] Product gap** — Refresh button added to the toolbar, paired with the freshness badge. Disabled while any endpoint is loading; the icon spins during refresh.

---

## Low-priority issues / nits

- **[LOW][FIXED] UX** — FunnelChart now falls back to a `formatLabel(slug)` helper that title-cases unknown statuses (e.g. `interview_followup` → `Interview Followup`) instead of leaking raw enum keys.

- **[LOW][FIXED] UX** — SkillFrequencyChart wraps the visual in `max-h-[600px] overflow-y-auto`, so the chart caps at viewport-friendly height and scrolls if the corpus grows beyond the server-side cap of 15 skills.

- **[LOW][FIXED] Performance** — ScoreDistributionChart `<Cell>` already keyed by `entry.bucket` (closing as already correct).

- **[LOW][FIXED] Type safety** — `useInsights` now runs a per-endpoint shape validator on success (`validatePipeline` / `validateTargets` / `validateSkillsCost`). Shape mismatches throw an `InsightsFetchError` with `kind: 'shape'`, which marks the endpoint as failed and surfaces in the error banner instead of silently rendering empty arrays.

- **[LOW][FIXED] Accessibility** — TargetComparisonChart's Tooltip uses an explicit `formatter` that whitelists `Avg Score` and `Conversion %`; any other series returns `null`, so computed/internal fields can't leak into the tooltip.

- **[LOW][FIXED] UX** — VelocityChart now renders a `<Legend>`, so the resumes vs applications series are labelled without hovering. CardTitle stays the same.

- **[LOW][FIXED] Code quality** — `fetchJSON` now throws `InsightsFetchError` with a discriminated `info` payload (`kind: 'http' | 'network' | 'parse' | 'shape'`). Consumers can branch on `err.info.kind`; the hook still collapses to `failedEndpoints` for the banner.

- **[LOW][FIXED] Backend** — `compute_skills_cost` now documents the binary present/absent treatment of missing skills (and the lack of frequency × score weighting) inline at the `pure_missing` block.

---

## Product gaps (not bugs, but worth considering)

- **[FIXED] Drill-down to evidence** — Funnel and score-distribution charts now expose a chip-row of `<Link>` drill-ins below the visual. Clicking a stage navigates to `/fitted/jobs?status=<stage>`; clicking a score bucket navigates to `/fitted/jobs?minScore=<lo>`. The jobs page parses both params and seeds the initial filter state. Real anchors (not Recharts onClick) so keyboard and screen-reader users get the same path as mouse users.
- **Comparative periods** — No "this month vs last month" or trend-over-trend.
- **Exportable reports** — No CSV/PDF export. Useful for job coaches.
- **Skill gap prioritization** — "Top missing skills" doesn't rank by frequency × job score, so users can't tell which gap matters most.
- **Pre-computed insights** — Computed on-demand per request. For 90-day periods on multi-user, scan thousands of rows. Consider daily materialized views or a background job.

---

## Files reviewed

- `apps/root/src/app/fitted/(app)/insights/page.tsx`
- `apps/root/src/app/fitted/(app)/insights/InsightsDashboard.tsx`
- `apps/root/src/app/fitted/(app)/insights/loading.tsx`
- `apps/root/src/app/fitted/(app)/insights/types.ts`
- `apps/root/src/app/fitted/(app)/insights/charts/{VelocityChart,FunnelChart,ScoreDistributionChart,CostChart,TargetComparisonChart,SkillFrequencyChart}.tsx`
- `apps/root/src/app/fitted/(app)/insights/charts/colors.ts`
- `apps/root/src/hooks/useInsights.ts`
- `apps/root/src/app/api/jobs/insights/{pipeline,targets,skills-cost}/route.ts`
- `apps/root/src/app/api/jobs/proxy.ts`
- `apps/job-api/app/routers/insights.py`
- `apps/job-api/app/models/insights.py`
- `apps/job-api/app/services/insights.py`
- `apps/job-api/tests/test_insights.py`
