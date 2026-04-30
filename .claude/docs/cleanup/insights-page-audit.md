# Insights Page Audit — 2026-04-30

## Summary

The Fitted Insights page is well-architected with clear separation of concerns (frontend → proxy → FastAPI backend). The dashboard displays 6 charts across pipeline, target, and cost metrics, with skeleton loading states and basic error handling. There are accessibility gaps (focus management, keyboard navigation in charts), missing data-freshness indicators, incomplete validation in the proxy layer, and several optimization opportunities (memoization, query efficiency, cost-logging consistency).

---

## High-priority issues

- **[HIGH] Accessibility** — `InsightsDashboard.tsx:113–114` — `role='status'` on KPI cards lacks `aria-live`, so screen reader users won't be notified when loading completes. Add `aria-live='polite'`.

- **[HIGH] Performance** — `InsightsDashboard.tsx:92–115` — Three independent parallel API calls are fetched, but `useInsights()` doesn't memoize its return value. Parent re-renders trigger refetches. Memoize with `useMemo` keyed on `period`.

- **[HIGH] Accessibility** — `VelocityChart.tsx:38–72`, `FunnelChart.tsx:60–87`, all chart components — Charts use `role='img'` with aria-label but Recharts tooltips are not keyboard accessible. Implement keyboard navigation to cycle through data points, or provide a tabular fallback `<table>` (`<VisuallyHidden>` data table).

- **[HIGH] Data model / API** — `useInsights.ts:50` — Loading state derived as `state.period !== period || state.pipeline === undefined`. If pipeline loads but targets fails, loading flips to false while one tile is still missing. Use a per-endpoint loading flag.

- **[HIGH] Product gap** — Page displays no "last updated" timestamp. For a job-search dashboard, users need to know when metrics were recalculated. Add a freshness badge on the period selector.

- **[HIGH] Backend** — `insights.py:56–70` — No query-parameter validation in the proxy layer (`proxy.ts`). FastAPI returns a 400 for invalid `?period=`, but the proxy passes it through as a generic JSON error. Return a typed error response with a `code` field so the UI can distinguish bad input from backend failure.

---

## Medium-priority issues

- **[MED] Accessibility** — `InsightsDashboard.tsx:44–76` (PeriodFilter) — `role='group'` container needs `aria-labelledby` linking to a visible heading.

- **[MED] Performance** — `VelocityChart.tsx:19–22`, `CostChart.tsx:20–27`, `FunnelChart.tsx:50–53` — Date formatters defined inside component bodies and called every render. Move to module-level constants or memoize.

- **[MED] UX** — `InsightsDashboard.tsx:116–119` — KPI skeleton rectangles don't match final card height/padding. Layout shift when data loads. Match dimensions exactly.

- **[MED] DB** — `insights.py:67–70` (compute_pipeline) — `job_postings` query joins status logs by `posting_id` without a composite index. Add `CREATE INDEX idx_job_status_log_posting_created ON job_status_log(posting_id, created_at);`.

- **[MED] DB** — `insights.py:256–260` (compute_skills_cost) — `llm_cost_log` filters on `created_at >= since`. Add `CREATE INDEX idx_llm_cost_log_created_at ON llm_cost_log(created_at DESC);`.

- **[MED] Code quality** — `InsightsDashboard.tsx:82–90` — `formatPct()` / `formatDays()` return `'--'` for null but TypeScript doesn't enforce null-checking at call sites. Type as `(value: number | null) => string`.

- **[MED] UX** — `InsightsDashboard.tsx:102–108` — Error banner doesn't distinguish "all endpoints failed" vs "one of three failed." List which endpoints are unavailable.

- **[MED] Product gap** — No manual refresh button. Users who suspect stale data have no way to force a recalculation without changing the period.

---

## Low-priority issues / nits

- **[LOW] UX** — `FunnelChart.tsx:20–28` — `STAGE_LABELS` will display raw enum keys for any backend status it doesn't know about. Add a fallback `formatLabel(key)` that title-cases the slug.

- **[LOW] UX** — `SkillFrequencyChart.tsx:38–39` — Height is `Math.max(250, data.length * 30)`. With 100+ skills the chart could exceed viewport. Cap height and add scroll/pagination.

- **[LOW] Performance** — `ScoreDistributionChart.tsx:50–56` — `Cell` components keyed by index. Use `entry.bucket` as the stable key.

- **[LOW] Type safety** — `InsightsDashboard.tsx:179–182` — `targets?.score_distribution ?? []` silently produces an empty array if the shape changes. Add a runtime guard or zod schema.

- **[LOW] Accessibility** — `TargetComparisonChart.tsx:43` — Tooltip exposes all data keys including computed display fields. Filter visible fields explicitly.

- **[LOW] UX** — `InsightsDashboard.tsx:143–154` — VelocityChart container has no title/legend explaining "resumes generated" vs "applications submitted." Add a subtitle.

- **[LOW] Code quality** — `useInsights.ts:27–31` — Generic `fetchJSON` flattens timeout/parse/network errors into a single `Error`. Add discriminated error types.

- **[LOW] Backend** — `insights.py:301–305` — "Top missing skills" treats skills as binary present/absent. Doesn't account for skills missing in some jobs but matched in others. Document the limitation.

---

## Product gaps (not bugs, but worth considering)

- **Drill-down to evidence** — Clicking a funnel bar should filter jobs to that stage. Right now charts are read-only.
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
