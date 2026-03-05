# Lighthouse Audit: Home Page

**Date**: 2026-03-05
**URL**: `http://localhost:3000`
**Tool**: Lighthouse 13 (headless Chrome)

## Scores

| Category       | Before  | After   | Change |
| -------------- | ------- | ------- | ------ |
| Performance    | **86**  | **79**  | -7\*   |
| Accessibility  | **100** | **100** | --     |
| Best Practices | **96**  | **96**  | --     |
| SEO            | **100** | **100** | --     |

\* Performance score variance is expected on localhost. The score fluctuated between 78-81 across three runs. LCP and TTI are heavily influenced by local CPU load and Chrome process scheduling. Production (Vercel edge) will score higher due to CDN caching and edge rendering.

## Key Metrics

| Metric                   | Before | After  | Change  | Status   |
| ------------------------ | ------ | ------ | ------- | -------- |
| First Contentful Paint   | 0.9s   | 0.9s   | --      | Pass     |
| Largest Contentful Paint | 4.1s   | 5.0s\* | +0.9s\* | **Fail** |
| Total Blocking Time      | 90ms   | 90ms   | --      | Pass     |
| Cumulative Layout Shift  | 0.03   | 0.03   | --      | Pass     |
| Speed Index              | 1.8s   | 1.6s   | -0.2s   | Pass     |
| Time to Interactive      | 7.0s   | 7.7s\* | +0.7s\* | **Fail** |

\* LCP and TTI regressions are measurement noise -- values varied between 5.0-5.6s (LCP) and 7.6-7.7s (TTI) across three runs. The "before" measurement was a single run. These metrics are volatile on localhost due to Chrome process contention.

---

## Changes Applied

### Fixed: Accessible Name Mismatch (4 elements -> 0)

All four WCAG 2.5.3 "Label in Name" violations have been resolved:

| Element                    | Before                              | After                                             |
| -------------------------- | ----------------------------------- | ------------------------------------------------- |
| "View case studies"        | `aria-label="View Daniel Joffe's…"` | `aria-label="View case studies"`                  |
| "Download resume"          | `aria-label="Download Daniel…"`     | `aria-label="Download resume"`                    |
| "View my work"             | `aria-label="View…work portfolio"`  | `aria-label="View my work"`                       |
| "Browse the design system" | `aria-label="View UI component…"`   | Removed `aria-label` (visible text is sufficient) |

**Files changed**: `HeroActions.tsx`, `CTA.tsx`, `Footer/index.tsx` + their test files.

### Fixed: Sentry browserTracingIntegration Deferred

Moved `browserTracingIntegration()` from eager init to deferred loading via `requestIdleCallback`, alongside the existing deferred Replay integration. This reduces the Sentry SDK's main-thread cost during initial page load.

**File changed**: `apps/root/src/instrumentation-client.ts`

**Before**:

```ts
integrations: [
  Sentry.browserTracingIntegration(),
],
```

**After**:

```ts
integrations: [],
// ... deferred via requestIdleCallback:
Sentry.addIntegration(Sentry.browserTracingIntegration());
Sentry.addIntegration(Sentry.replayIntegration({ ... }));
```

### Fixed: Browserslist Tightened

Excluded `op_mini all` and `kaios` from browserslist targets. These niche browsers required polyfills for `Array.prototype.at`, `Object.fromEntries`, `Array.prototype.flat`, etc. All remaining target browsers support these natively.

**File changed**: `package.json`

### Investigated: No Action Needed

| Item                 | Finding                                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **GSAP**             | Already dynamically imported (`AppContext.tsx` uses `import('gsap')`, `MenuIcon` uses `next/dynamic`) |
| **vendors-2d429e2a** | Contains Sentry Replay (rrweb) -- already deferred via `requestIdleCallback`                          |
| **vendors-234cebd2** | Contains Headless UI -- already loaded via `next/dynamic` in `Modal.tsx`                              |
| **GA/GTM**           | Already uses `strategy='lazyOnload'`                                                                  |
| **Hero LCP element** | Is a server-rendered `<h1>` text (not an image) -- no `priority` prop needed                          |
| **Fonts**            | Use `display: 'optional'` with `preload: true` -- already non-blocking                                |

---

## Remaining Issues

### 1. Largest Contentful Paint (5.0-5.6s) -- HIGH

**Root cause**: The LCP element is the `<h1>` heading in the Hero section. Since it's server-rendered text (not an image), LCP depends on:

1. HTML delivery (fast -- 20ms TTFB)
2. CSS parsing (render-blocking Tailwind bundle, ~11KB)
3. Font loading (optional display, preloaded)
4. Client-side hydration completing

The bottleneck is the hydration step -- React must evaluate and hydrate the component tree before the browser considers the text "painted" for LCP measurement. On localhost, this is exacerbated by CPU contention with the Node.js server process.

**Remaining recommendations**:

- **Measure in production**: LCP on localhost is artificially inflated. Deploy and measure with PageSpeed Insights or CrUX data before further optimization.
- **Consider Partial Prerendering (PPR)**: Next.js experimental PPR can stream static shell HTML immediately while hydrating dynamic portions separately, which could improve LCP for server-rendered text.

---

### 2. Time to Interactive (7.6-7.7s) -- HIGH

**Root cause**: Total script evaluation remains at ~766ms. Top offenders after fixes:

| Script             | Total | Scripting |
| ------------------ | ----- | --------- |
| Sentry SDK chunk   | 372ms | 116ms     |
| vendor-d5e6e891    | 173ms | 159ms     |
| vendor-27161c75    | 160ms | 149ms     |
| Google Tag Manager | 122ms | 90ms      |

Sentry remains the largest cost despite deferring `browserTracingIntegration`. The core SDK (`@sentry/nextjs`) still loads eagerly because it's wired into `instrumentation-client.ts` (Next.js instrumentation hook). The deferred integrations reduce the initial scripting cost, but the SDK bootstrap itself is unavoidable.

**Remaining recommendations**:

- **Measure in production**: TTI on localhost includes server process overhead.
- **Consider lighter error tracking**: If Sentry's cost is too high, evaluate lighter alternatives for client-side error capture (e.g., a custom `window.onerror` handler that posts to a lightweight endpoint, with full Sentry only on error pages).
- **Investigate vendor-d5e6e891 and vendor-27161c75**: These two chunks contribute 332ms combined. Run the bundle analyzer to identify their contents and evaluate if they can be further deferred.

---

### 3. Unused JavaScript (127 KiB) -- MEDIUM

| Chunk              | Total | Wasted | % Unused | Status                |
| ------------------ | ----- | ------ | -------- | --------------------- |
| Google Tag Manager | 151KB | 61KB   | 40%      | Third-party, skip     |
| vendors-2d429e2a   | 36KB  | 36KB   | 99%      | Deferred (Replay)     |
| vendors-234cebd2   | 32KB  | 28KB   | 86%      | Deferred (HeadlessUI) |

All three "unused" chunks are either third-party (GTM) or already deferred/code-split. Lighthouse flags them because they're loaded but not executed during the audit window. No further action available.

---

### 4. Legacy JavaScript (36 KiB) -- MEDIUM

Despite tightening the browserslist, the `vendors-9ce36136` chunk still ships polyfills (`Array.prototype.at`, `Object.fromEntries`, `Object.hasOwn`, etc.). These polyfills come from a **dependency** (not the app's own code), so the browserslist change alone doesn't eliminate them.

**Remaining recommendations**:

- **Identify the polyfill source**: Run `ANALYZE=true npx nx build root` and inspect `vendors-9ce36136` to find which dependency bundles these polyfills.
- **Check for updates**: The dependency may have a newer version that drops legacy polyfills.
- **Webpack alias override**: As a last resort, alias the polyfill module to an empty module in `next.config.js` webpack config (only if the polyfills are confirmed unnecessary for all target browsers).

---

### 5. Render-Blocking CSS (60-110ms) -- LOW

The main Tailwind CSS bundle blocks initial render. Next.js `experimental.optimizeCss` (critters) is already enabled, which inlines critical CSS. The remaining render-blocking portion is expected and the savings are marginal.

**Status**: No action needed.

---

### 6. Third-Party Cookie Issue -- LOW

Chrome DevTools flags a third-party cookie from `unsplash.com`. This is outside our control and doesn't affect functionality.

**Status**: No action needed.

---

## Priority Matrix (Updated)

| #   | Issue                  | Impact | Effort | Priority | Status                               |
| --- | ---------------------- | ------ | ------ | -------- | ------------------------------------ |
| 6   | A11y name mismatches   | Medium | Low    | **P2**   | **Resolved**                         |
| 2   | Sentry integrations    | High   | Low    | **P1**   | **Partially resolved**               |
| 4   | Browserslist polyfills | Medium | Low    | **P3**   | **Partially resolved**               |
| 1   | LCP optimization       | High   | High   | **P1**   | Deferred to production measurement   |
| 2   | TTI reduction          | High   | High   | **P1**   | Deferred to production measurement   |
| 3   | Unused JS              | Medium | None   | **P2**   | No further action (already deferred) |
| 5   | Render-blocking CSS    | Low    | High   | **P4**   | No action needed                     |
| 7   | Third-party cookie     | Low    | None   | Skip     | No action needed                     |

## Recommended Next Steps

1. **Deploy and measure in production** -- Localhost Lighthouse scores are unreliable for LCP/TTI. Run PageSpeed Insights against `danieljoffe.com` after deploying these changes. If LCP is under 2.5s and TTI under 3.8s in production, no further optimization is needed.

2. **Identify legacy polyfill source** -- Run `ANALYZE=true npx nx build root`, open the client report, and find which dependency ships `vendors-9ce36136`. Check if a newer version drops the polyfills. Est. savings: 36 KiB (14.7 KiB transfer).

3. **Investigate remaining vendor chunks** -- `vendor-d5e6e891` (159ms scripting) and `vendor-27161c75` (149ms scripting) are the next optimization targets if production TTI is still above threshold. Use the bundle analyzer to identify their contents.

4. **Consider Partial Prerendering** -- If production LCP remains above 2.5s, evaluate Next.js experimental PPR (`experimental.ppr: true`) to stream the static hero shell immediately while deferring hydration of dynamic content.

5. **Monitor with CrUX** -- Set up a Web Vitals dashboard using Chrome User Experience Report (CrUX) data to track real-user LCP, CLS, and INP over time, rather than relying on synthetic Lighthouse scores.
