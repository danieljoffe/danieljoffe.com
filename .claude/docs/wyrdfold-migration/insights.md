# Insights Surface — Wyrdfold Migration Audit

Issue: #586 · Branch base: `chore/fitted-ui-refinements` · Audit date: 2026-05-01

## TL;DR

Insights is **16 files / ~1,583 LOC** with a clean architecture:

- **InsightsDashboard.tsx** (490 LOC) — orchestrates 7 charts +
  StatsCards + period filter + CSV export
- **8 chart components** in `charts/` — all `dynamic()` imports
  (SSR-disabled because Recharts is client-only)
- **`useInsights` hook** (`apps/root/src/hooks/useInsights.ts`) —
  the data layer; calls 3 BFF endpoints concurrently
- **`exportCsv.ts`** (201 LOC) — pure-TS CSV serializer with
  proper escaping, **already has unit tests** (lone test file in
  the entire Fitted surface area)
- **`types.ts`** — Period + 9 insights interfaces

External dep: **Recharts** (sole non-shared-ui external dep on
the entire Fitted surface). Used by 6 of 8 chart components.

Gold standard for a port: **most isolated, most tested, cleanest
data flow** of any audited Fitted surface. Just substitute paths
and fork.

## 1. Surface inventory

```
apps/root/src/app/fitted/(app)/insights/
├── page.tsx                    24
├── loading.tsx                 39
├── types.ts                    98   Period + 9 insights interfaces
├── InsightsDashboard.tsx      490   client orchestrator
├── exportCsv.ts               201   pure-TS CSV serializer
├── __tests__/
│   └── exportCsv.spec.ts            unit tests (lone Fitted test)
└── charts/
    ├── ChartFigure.tsx         62   <figure> wrapper + a11y heading
    ├── colors.ts                    palette constants
    ├── format.ts                    number formatters
    ├── CostChart.tsx           93   recharts AreaChart
    ├── FunnelChart.tsx        138   recharts BarChart + table
    ├── ScoreDistributionChart.tsx 117  recharts BarChart
    ├── SkillFrequencyChart.tsx 91   recharts BarChart
    ├── TargetComparisonChart.tsx 89  recharts BarChart
    ├── TopSkillGaps.tsx        61   plain table (no recharts)
    └── VelocityChart.tsx       80   recharts LineChart
```

## 2. API endpoints (3)

```
GET /api/jobs/insights/pipeline?period=7d|30d|90d|all
GET /api/jobs/insights/targets?period=...
GET /api/jobs/insights/skills-cost?period=...
```

`useInsights` fetches all three concurrently with abort signals
and tracks per-source error states (`'network' | 'http'`)
separately. Response shapes encoded in `types.ts`.

## 3. Hardcoded /fitted paths

```
charts/FunnelChart.tsx:128         href={`/fitted/jobs?status=${row.stage}`}
charts/ScoreDistributionChart.tsx:101  href={`/fitted/jobs?minScore=${...}`}
```

**Two** drill-through links from charts → jobs list. Trivial
substitutions.

## 4. Recharts dep

Used by 6 of 8 chart components. ~50KB gzipped, lazy-loaded via
`dynamic({ ssr: false })` in InsightsDashboard so it doesn't
inflate the initial bundle.

For Wyrdfold:

- Keep Recharts. The Pyre theme works fine — just verify the
  default chart palette in `charts/colors.ts` is overridden to
  use Pyre's chartreuse + dark surface tokens, not Recharts'
  default categorical palette.
- **No need to evaluate alternatives** (Visx, Tremor, etc.) —
  Recharts is doing the job, and switching is unrelated to
  migration goals.

## 5. CSV export

`exportCsv.ts` is a self-contained pure function:

- accepts the three insights payloads + period label
- emits a multi-section CSV with headers and proper escaping
- handles quoting (`,`, `"`, `\n`) per RFC 4180
- triggers download via `URL.createObjectURL` + temporary
  `<a download>`

This file has **the only existing unit tests in the Fitted
surface area** (`__tests__/exportCsv.spec.ts`). Other surfaces
should mimic this pattern in #594.

## 6. shared-ui usage

| Component                                           | Where                           |
| --------------------------------------------------- | ------------------------------- |
| `Card` / `CardContent` / `CardHeader` / `CardTitle` | InsightsDashboard               |
| `StatsCard`                                         | InsightsDashboard (4 KPI cards) |
| `Skeleton`                                          | InsightsDashboard, loading.tsx  |
| `Text`                                              | InsightsDashboard, ChartFigure  |

ChartFigure is a domain-local wrapper (`<figure>` + heading +
description + Recharts container) — keep app-local, do NOT
promote to shared-ui (chart-specific, niche).

## 7. Accessibility patterns to preserve

InsightsDashboard implements the period filter as a
`<button role='group' aria-labelledby>...</button>` segmented
control with `aria-pressed`. Keyboard-navigable, screen-reader
friendly.

Each `ChartFigure` wraps the chart in `<figure>` with
`<figcaption>` for the title — non-visual users get a description
without needing to inspect the SVG.

Drill-through links in FunnelChart + ScoreDistributionChart use
`<a href>` (not `<button>`) so keyboard users get standard
follow-link behavior.

These patterns are **a11y best-in-class** for the Fitted surfaces.
Port verbatim.

## 8. Cross-surface coupling

- **Jobs ← Insights:** drill-through `?status=` and `?minScore=`
  query params. JobsList.tsx consumes these via JobsFilter.
- **Targets ← Insights:** TargetComparisonChart consumes
  `target_label` strings — purely display, no deeplinks.
- **Profile ← Insights:** none.

## 9. Wyrdfold port checklist

- [ ] Copy 16 files from `apps/root/src/app/fitted/(app)/insights/`
- [ ] Copy `apps/root/src/hooks/useInsights.ts`
- [ ] Substitute 2 hardcoded `/fitted/...` paths
- [ ] Verify `charts/colors.ts` uses Pyre theme tokens, not
      hardcoded Recharts default colors
- [ ] Re-wire to wyrdfold's `/api/jobs/insights/*`
- [ ] Add Storybook stories for each chart component using mock
      data (helps tune Pyre palette)
- [ ] Add unit tests for: `useInsights` hook (fetch states,
      abort), `InsightsDashboard` (period switch, CSV download)
- [ ] Already-tested: `exportCsv.ts` ✓

## 10. Open questions

1. **Pyre chart palette.** `charts/colors.ts` likely uses fixed
   hex values. Must be retuned for chartreuse-on-near-black —
   bar fills, axis text, tooltip backgrounds, grid lines all
   need WCAG AA contrast against `--color-surface`.
2. **Period filter persistence.** Currently local React state —
   refresh resets to default '30d'. URL-state would persist;
   localStorage is another option. Defer past migration unless
   user feedback flags it.
3. **CSV export filename.** Currently
   `insights-{period}-{date}.csv`. Wyrdfold variant should
   prefix with the brand for clarity.
4. **Chart bundle size.** Recharts is ~50KB gzipped, lazy-loaded.
   If Wyrdfold's perf budget is tighter, consider tree-shaking
   recharts imports (some chart components import only the bits
   they need — verify in #595 platform readiness audit).

## 11. Decision summary

| Question                       | Answer                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------- |
| Files to port                  | 16 (~1,583 LOC)                                                              |
| API endpoints                  | 3 (audited in #590)                                                          |
| External deps beyond shared-ui | Recharts (keep)                                                              |
| Existing test coverage         | 1 file: `exportCsv.spec.ts` (gold standard pattern)                          |
| `/fitted` substitutions        | 2 hits                                                                       |
| Refactor candidates            | None — InsightsDashboard at 490 LOC is reasonable for the orchestration role |
| Pyre theme work                | Retune `charts/colors.ts` for chartreuse-on-near-black                       |

## 12. Collisions

Other session is editing `apps/job-api/`. **No overlap** with
the insights surface. This audit modifies docs only.
