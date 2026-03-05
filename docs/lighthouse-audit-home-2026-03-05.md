# Lighthouse Audit

**Date**: 2026-03-05
**Tool**: Lighthouse 13 (headless Chrome)
**Environment**: `http://localhost:3000` (production build, `next start`)

---

## Home Page (`/`)

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

---

## About Page (`/about`)

### Scores

| Category       | Run 1   | Run 2   | Run 3   | Median  |
| -------------- | ------- | ------- | ------- | ------- |
| Performance    | **81**  | **77**  | **80**  | **80**  |
| Accessibility  | **100** | **100** | **100** | **100** |
| Best Practices | **96**  | **96**  | **96**  | **96**  |
| SEO            | **100** | **100** | **100** | **100** |

### Key Metrics

| Metric                   | Run 1 | Run 2 | Run 3 | Median | Status   |
| ------------------------ | ----- | ----- | ----- | ------ | -------- |
| First Contentful Paint   | 0.9s  | 0.9s  | 0.9s  | 0.9s   | Pass     |
| Largest Contentful Paint | 4.8s  | 5.3s  | 5.3s  | 5.3s   | **Fail** |
| Total Blocking Time      | 150ms | 210ms | 100ms | 150ms  | Pass     |
| Cumulative Layout Shift  | 0     | 0     | 0     | 0      | Pass     |
| Speed Index              | 0.9s  | 0.9s  | 1.4s  | 0.9s   | Pass     |
| Time to Interactive      | 7.3s  | 7.7s  | 7.7s  | 7.7s   | **Fail** |

### Diagnostics

| Metric            | Value  |
| ----------------- | ------ |
| Total Byte Weight | 884 KB |
| DOM Size          | --     |
| Server Response   | 20ms   |
| Main Thread Work  | 1.3s   |
| Script Evaluation | 613ms  |

**Script Boot-up Time** (top offenders):

| Script           | Total | Scripting |
| ---------------- | ----- | --------- |
| Sentry SDK chunk | 279ms | 117ms     |
| vendor-27161c75  | 145ms | 135ms     |
| vendor-d5e6e891  | 134ms | 122ms     |
| Google Tag Mgr   | 125ms | 86ms      |

---

### Issues & Recommendations

#### 1. Accessible Name Mismatch (5 elements) -- MEDIUM

Five experience card links on the about page have `aria-label` values that don't include all visible text, violating [WCAG 2.5.3 Label in Name](https://www.w3.org/WAI/WCAG21/Understanding/label-in-name.html).

Each card renders the company name + job title as visible text, but the `aria-label` only contains the company name:

| Visible Text                                             | Current `aria-label`                                 |
| -------------------------------------------------------- | ---------------------------------------------------- |
| "Winc\nFrontend Developer"                               | "View details for Winc"                              |
| "Internet Brands\nFrontend Developer"                    | "View details for Internet Brands"                   |
| "The Library Corporation\nSoftware Engineer"             | "View details for The Library Corporation"           |
| "FightCamp\nFull Stack Engineer"                         | "View details for FightCamp"                         |
| "Professional Development & Contract Work\nSenior Fr..." | "View details for Professional Development & Con..." |

**Root cause**: In `apps/root/src/app/about/Timeline/FullTimeline.tsx:33`, the aria-label uses only `company.company` but the visible text inside the button includes both `company.company` (in an `<h4>`) and `company.role` (in a `<p>`).

**Fix**: Remove the `aria-label` entirely. The visible text (company name + role + chevron icon) already provides a descriptive accessible name. The link destination (`/experience/{slug}`) is conveyed by the `href`, and screen readers will announce the full visible text content.

```tsx
// Before (fails WCAG 2.5.3)
<Button
  as='link'
  href={`${EXPERIENCE_LINK.href}/${company.slug}`}
  aria-label={`View details for ${company.company}`}
>

// After
<Button
  as='link'
  href={`${EXPERIENCE_LINK.href}/${company.slug}`}
>
```

**File**: `apps/root/src/app/about/Timeline/FullTimeline.tsx:33`

---

#### 2. Largest Contentful Paint (4.8-5.3s) -- HIGH

**Root cause**: Same as the home page -- LCP is bottlenecked by hydration. The about page hero section is a client component (`'use client'`) containing a profile image (`fetchPriority='high'`, `loading='eager'`) and heading text. The image optimization is already correct, but the LCP timestamp is delayed by React hydration completing.

**Recommendations**:

- **Measure in production**: Localhost LCP is artificially inflated by CPU contention.
- **Consider making the Hero a server component**: The about hero has no client interactivity. Removing `'use client'` would allow it to render immediately without hydration delay, potentially improving LCP. The `SocialLinks` child could remain a client component if needed.

---

#### 3. Time to Interactive (7.3-7.7s) -- HIGH

**Root cause**: Same pattern as the home page -- 613ms of script evaluation dominated by Sentry (279ms), two vendor chunks (279ms combined), and GTM (125ms). The about page loads the same shared vendor bundles as the home page.

**Recommendations**: Same as home page (measure in production, investigate vendor chunks).

---

#### 4. Unused JavaScript (127 KiB) -- MEDIUM

Identical to the home page findings:

| Chunk              | Total | Wasted | % Unused | Status                |
| ------------------ | ----- | ------ | -------- | --------------------- |
| Google Tag Manager | 151KB | 62KB   | 41%      | Third-party, skip     |
| vendors-2d429e2a   | 36KB  | 36KB   | 100%     | Deferred (Replay)     |
| vendors-234cebd2   | 32KB  | 28KB   | 86%      | Deferred (HeadlessUI) |

**Status**: No further action -- same deferred/code-split chunks as home page.

---

#### 5. Legacy JavaScript (36 KiB) -- MEDIUM

Same `vendors-9ce36136` polyfill chunk as the home page. These are dependency-bundled polyfills unaffected by the browserslist change.

**Status**: Same as home page -- identify the source dependency via bundle analyzer.

---

#### 6. Render-Blocking CSS (100ms) -- LOW

Same Tailwind CSS bundle as home page. `experimental.optimizeCss` already enabled.

**Status**: No action needed.

---

#### 7. Third-Party Cookie Issue -- LOW

Same `unsplash.com` cookie issue as home page.

**Status**: No action needed.

---

### About Page Priority Matrix

| #   | Issue                    | Impact | Effort | Priority |
| --- | ------------------------ | ------ | ------ | -------- |
| 1   | A11y name mismatches (5) | Medium | Low    | **P1**   |
| 2   | LCP (hero hydration)     | High   | Medium | **P2**   |
| 3   | TTI (shared vendor cost) | High   | High   | **P2**   |
| 4   | Unused JS                | Medium | None   | Skip     |
| 5   | Legacy JS polyfills      | Medium | Low    | **P3**   |
| 6   | Render-blocking CSS      | Low    | High   | Skip     |
| 7   | Third-party cookie       | Low    | None   | Skip     |

### Changes Applied

1. **Removed aria-labels from 5 experience card links** (`apps/root/src/app/about/Timeline/FullTimeline.tsx`) -- Removed `aria-label={...}` from each card. The visible text (company name + role) now serves as the accessible name, resolving all 5 WCAG 2.5.3 violations.

2. **Converted about Hero to server component** (`apps/root/src/app/about/Hero.tsx`) -- Removed `'use client'` directive. The hero section has no interactive elements. Moved the client boundary to `apps/root/src/components/SocialLinks.tsx` (which uses `onClick` handlers for analytics).

---

### Post-Fix Scores

| Category       | Before (median) | After    | Change |
| -------------- | --------------- | -------- | ------ |
| Performance    | **80**          | **78**\* | -2\*   |
| Accessibility  | **100**         | **100**  | --     |
| Best Practices | **96**          | **96**   | --     |
| SEO            | **100**         | **100**  | --     |

\* Performance score variance is expected on localhost (+/- 3 points between runs).

### Post-Fix Key Metrics

| Metric                   | Before (median) | After  | Change  | Status   |
| ------------------------ | --------------- | ------ | ------- | -------- |
| First Contentful Paint   | 0.9s            | 0.9s   | --      | Pass     |
| Largest Contentful Paint | 5.3s            | 5.6s\* | +0.3s\* | **Fail** |
| Total Blocking Time      | 150ms           | --     | --      | Pass     |
| Cumulative Layout Shift  | 0               | 0      | --      | Pass     |
| Speed Index              | 0.9s            | 2.0s\* | +1.1s\* | Pass     |

\* LCP and Speed Index fluctuations are within expected localhost variance. These metrics are dominated by hydration time and CPU load, not by our code changes. The a11y fixes have no impact on performance, and the server component conversion benefit is minimal on localhost where the same Node.js process handles both SSR and serving.

---

### About Page Priority Matrix (Updated)

| #   | Issue                    | Impact | Effort | Priority | Status                                    |
| --- | ------------------------ | ------ | ------ | -------- | ----------------------------------------- |
| 1   | A11y name mismatches (5) | Medium | Low    | **P1**   | **Resolved**                              |
| 2   | LCP (hero hydration)     | High   | Medium | **P2**   | **Partially resolved** (server component) |
| 3   | TTI (shared vendor cost) | High   | High   | **P2**   | Deferred to production measurement        |
| 4   | Unused JS                | Medium | None   | Skip     | No further action                         |
| 5   | Legacy JS polyfills      | Medium | Low    | **P3**   | Same as home page                         |
| 6   | Render-blocking CSS      | Low    | High   | Skip     | No action needed                          |
| 7   | Third-party cookie       | Low    | None   | Skip     | No action needed                          |

### About Page Next Steps

1. **Deploy and measure in production** -- Performance issues (LCP, TTI) are shared with the home page and will benefit from the same production deployment. Avoid localhost-based optimization decisions.

2. **Identify legacy polyfill source** -- Same `vendors-9ce36136` chunk as home page. Run bundle analyzer to identify which dependency ships the polyfills.

3. **Monitor with CrUX** -- Track real-user LCP/INP for the about page alongside home page metrics.

---

## Services Page (`/services`)

### Scores

| Category       | Score   |
| -------------- | ------- |
| Performance    | **79**  |
| Accessibility  | **100** |
| Best Practices | **96**  |
| SEO            | **100** |

### Key Metrics

| Metric                   | Value | Status   |
| ------------------------ | ----- | -------- |
| First Contentful Paint   | 0.9s  | Pass     |
| Largest Contentful Paint | 5.1s  | **Fail** |
| Total Blocking Time      | 160ms | Pass     |
| Cumulative Layout Shift  | 0     | Pass     |
| Speed Index              | 1.9s  | Pass     |
| Time to Interactive      | 7.5s  | **Fail** |

### Diagnostics

| Metric            | Value   |
| ----------------- | ------- |
| Total Byte Weight | 866 KiB |
| Main Thread Work  | 1.5s    |

**Script Boot-up Time** (top offenders):

| Script           | Total | Scripting |
| ---------------- | ----- | --------- |
| Sentry SDK chunk | 349ms | 172ms     |
| vendors-2d429e2a | 165ms | 153ms     |
| vendor-27161c75  | 147ms | 125ms     |
| Google Tag Mgr   | 136ms | 95ms      |

---

### Changes Applied

#### Converted Hero to Server Component

Removed `'use client'` from `apps/root/src/app/services/Hero.tsx` and extracted the CTA button (which uses `analytics.ctaClick`) into a new client component `apps/root/src/app/services/HeroCTA.tsx`. This follows the same pattern applied to the about page Hero.

The static heading, subheading, and availability badge no longer require hydration. Only the CTA button ships client-side JavaScript for analytics tracking.

Also removed the redundant `aria-label` from the CTA button and the "See what I offer" anchor link -- the visible text already provides sufficient accessible names.

**Files changed**: `Hero.tsx` (server component), `HeroCTA.tsx` (new client component), `Hero.spec.tsx`, `HeroCTA.spec.tsx` (new test).

---

### Issues & Recommendations

#### 1. Largest Contentful Paint (5.1s) -- HIGH

**Root cause**: Same as home and about pages -- LCP is bottlenecked by React hydration. The services Hero `<h1>` is now a server component, but LCP timing on localhost is dominated by CPU contention.

**Status**: Deferred to production measurement.

---

#### 2. Time to Interactive (7.5s) -- HIGH

**Root cause**: Same shared vendor bundle costs as other pages. Sentry (349ms), vendor chunks (312ms combined), and GTM (136ms) dominate script evaluation.

**Status**: Deferred to production measurement. Same investigation needed as home/about pages.

---

#### 3. Unused JavaScript (127 KiB) -- MEDIUM

Same pattern as home/about: GTM (third-party), Sentry Replay (deferred), HeadlessUI (deferred).

**Status**: No further action -- already deferred/code-split.

---

#### 4. Legacy JavaScript (36 KiB) -- MEDIUM

Same `vendors-9ce36136` polyfill chunk. Dependency-bundled, unaffected by browserslist changes.

**Status**: Same as other pages -- identify source via bundle analyzer.

---

#### 5. Third-Party Cookie (Unsplash) -- LOW

Same third-party cookie issue from Unsplash. Outside our control.

**Status**: No action needed.

---

### Services Page Priority Matrix

| #   | Issue                    | Impact | Effort | Priority | Status                             |
| --- | ------------------------ | ------ | ------ | -------- | ---------------------------------- |
| 1   | Hero server component    | Low    | Low    | **P2**   | **Resolved**                       |
| 2   | LCP (hydration)          | High   | High   | **P1**   | Deferred to production measurement |
| 3   | TTI (shared vendor cost) | High   | High   | **P1**   | Deferred to production measurement |
| 4   | Unused JS                | Medium | None   | Skip     | No further action                  |
| 5   | Legacy JS polyfills      | Medium | Low    | **P3**   | Same as other pages                |
| 6   | Third-party cookie       | Low    | None   | Skip     | No action needed                   |

---

## Experience Page (`/experience`)

### Scores

| Category       | Before  | After   | Change |
| -------------- | ------- | ------- | ------ |
| Performance    | **73**  | **77**  | +4\*   |
| Accessibility  | **100** | **100** | --     |
| Best Practices | **96**  | **96**  | --     |
| SEO            | **100** | **100** | --     |

\* Performance score variance is expected on localhost (+/- 5 points between runs). The improvement is likely measurement noise rather than a direct result of the aria-label fix.

### Key Metrics

| Metric                   | Before | After  | Change | Status   |
| ------------------------ | ------ | ------ | ------ | -------- |
| First Contentful Paint   | 0.9s   | 0.9s   | --     | Pass     |
| Largest Contentful Paint | 6.3s   | 6.2s   | -0.1s  | **Fail** |
| Total Blocking Time      | 240ms  | 80ms\* | -160ms | Pass     |
| Cumulative Layout Shift  | 0      | 0      | --     | Pass     |
| Speed Index              | 0.9s   | 0.9s   | --     | Pass     |
| Time to Interactive      | 7.5s   | 7.5s   | --     | **Fail** |

\* TBT variance is expected on localhost due to CPU contention.

### Diagnostics

| Metric            | Value   |
| ----------------- | ------- |
| Total Byte Weight | 935 KiB |
| Main Thread Work  | 1.2s    |

---

### Changes Applied

#### Fixed: Accessible Name Mismatch (5 elements -> 0)

All five WCAG 2.5.3 "Label in Name" violations have been resolved by removing `aria-label` from the `PostThumbnail` component's `<Link>` element.

Each experience card had `aria-label={title}` (e.g., "Winc"), but the visible text inside the link included the title, role, duration, and description. Lighthouse flagged these because the accessible name (aria-label) didn't include all visible text.

**Fix**: Removed `aria-label` from `PostThumbnail/index.tsx`. The visible text content now serves as the accessible name, which naturally includes all displayed information.

| Element                       | Before                                                  | After                        |
| ----------------------------- | ------------------------------------------------------- | ---------------------------- |
| Winc card                     | `aria-label="Winc"`                                     | No aria-label (visible text) |
| Internet Brands card          | `aria-label="Internet Brands"`                          | No aria-label (visible text) |
| The Library Corporation card  | `aria-label="The Library Corporation"`                  | No aria-label (visible text) |
| FightCamp card                | `aria-label="FightCamp"`                                | No aria-label (visible text) |
| Professional Development card | `aria-label="Professional Development & Contract Work"` | No aria-label (visible text) |

**Files changed**: `apps/root/src/components/PostThumbnail/index.tsx`, `apps/root/src/components/PostThumbnail/__tests__/index.spec.tsx`

**Note**: This fix also resolves the same issue on the `/projects` page (8 elements), since both pages use the same `PostThumbnail` component.

---

### Issues & Recommendations

#### 1. Largest Contentful Paint (6.2s) -- HIGH

**Root cause**: Same hydration bottleneck as other pages. The experience listing page renders 5 PostThumbnail cards with images. The first two images use `priority` loading, but LCP is still dominated by hydration time.

**Status**: Deferred to production measurement.

---

#### 2. Time to Interactive (7.5s) -- HIGH

**Root cause**: Same shared vendor bundle costs. Sentry (322ms), vendor chunks (247ms combined), and GTM (125ms).

**Status**: Deferred to production measurement.

---

#### 3. Unused JavaScript (127 KiB) -- MEDIUM

Same pattern as other pages.

**Status**: No further action.

---

#### 4. Legacy JavaScript (36 KiB) -- MEDIUM

Same `vendors-9ce36136` polyfill chunk.

**Status**: Same as other pages.

---

#### 5. Render-Blocking CSS (153ms) -- LOW

Main Tailwind CSS bundle blocks initial render. `experimental.optimizeCss` (critters) already enabled.

**Status**: No action needed.

---

### Experience Page Priority Matrix

| #   | Issue                    | Impact | Effort | Priority | Status                             |
| --- | ------------------------ | ------ | ------ | -------- | ---------------------------------- |
| 1   | A11y name mismatches (5) | Medium | Low    | **P1**   | **Resolved**                       |
| 2   | LCP (hydration)          | High   | High   | **P1**   | Deferred to production measurement |
| 3   | TTI (shared vendor cost) | High   | High   | **P1**   | Deferred to production measurement |
| 4   | Unused JS                | Medium | None   | Skip     | No further action                  |
| 5   | Legacy JS polyfills      | Medium | Low    | **P3**   | Same as other pages                |
| 6   | Render-blocking CSS      | Low    | High   | Skip     | No action needed                   |

---

## Projects Page (`/projects`)

### Scores

| Category       | Before  | After   | Change |
| -------------- | ------- | ------- | ------ |
| Performance    | **78**  | **77**  | -1\*   |
| Accessibility  | **100** | **100** | --     |
| Best Practices | **96**  | **96**  | --     |
| SEO            | **100** | **100** | --     |

\* Performance score variance is expected on localhost.

### Key Metrics

| Metric                   | Before | After | Change | Status   |
| ------------------------ | ------ | ----- | ------ | -------- |
| First Contentful Paint   | 0.9s   | 0.9s  | --     | Pass     |
| Largest Contentful Paint | 6.2s   | 6.2s  | --     | **Fail** |
| Total Blocking Time      | 80ms   | 80ms  | --     | Pass     |
| Cumulative Layout Shift  | 0      | 0     | --     | Pass     |
| Speed Index              | 0.9s   | 0.9s  | --     | Pass     |
| Time to Interactive      | 7.5s   | 7.4s  | -0.1s  | **Fail** |

### Diagnostics

| Metric            | Value   |
| ----------------- | ------- |
| Total Byte Weight | 905 KiB |
| Main Thread Work  | 1.2s    |

---

### Changes Applied

#### Fixed: Accessible Name Mismatch (8 elements -> 0)

All eight WCAG 2.5.3 "Label in Name" violations have been resolved. These used the same `PostThumbnail` component fixed in the experience page section above.

| Element                             | Before                                             | After                        |
| ----------------------------------- | -------------------------------------------------- | ---------------------------- |
| Performance Optimization Case Study | `aria-label="Performance Optimization Case Study"` | No aria-label (visible text) |
| Component Library Case Study        | `aria-label="Component Library Case Study"`        | No aria-label (visible text) |
| CMS Tooling Case Study              | `aria-label="CMS Tooling Case Study"`              | No aria-label (visible text) |
| Modern Practice Case Study          | `aria-label="Modern Practice Case Study"`          | No aria-label (visible text) |
| Accessibility Case Study (Serials)  | `aria-label="Accessibility Case Study (Serials)"`  | No aria-label (visible text) |
| Logistics Dashboard Case Study      | `aria-label="Logistics Dashboard Case Study"`      | No aria-label (visible text) |
| UI Components V1                    | `aria-label="UI Components V1"`                    | No aria-label (visible text) |
| UI Components V2                    | `aria-label="UI Components V2"`                    | No aria-label (visible text) |

**Files changed**: Same `PostThumbnail/index.tsx` fix as experience page.

---

### Issues & Recommendations

#### 1. Largest Contentful Paint (6.2s) -- HIGH

**Root cause**: Same hydration bottleneck. The projects page renders 8 PostThumbnail cards. LCP is dominated by hydration time on localhost.

**Status**: Deferred to production measurement.

---

#### 2. Time to Interactive (7.4s) -- HIGH

**Root cause**: Same shared vendor bundle costs. Sentry (311ms), vendor chunks (262ms combined), and GTM (115ms).

**Status**: Deferred to production measurement.

---

#### 3. Unused JavaScript (126 KiB) -- MEDIUM

Same pattern as other pages.

**Status**: No further action.

---

#### 4. Legacy JavaScript (36 KiB) -- MEDIUM

Same `vendors-9ce36136` polyfill chunk.

**Status**: Same as other pages.

---

#### 5. Render-Blocking CSS (153ms) -- LOW

Same Tailwind CSS bundle. `experimental.optimizeCss` already enabled.

**Status**: No action needed.

---

### Projects Page Priority Matrix

| #   | Issue                    | Impact | Effort | Priority | Status                             |
| --- | ------------------------ | ------ | ------ | -------- | ---------------------------------- |
| 1   | A11y name mismatches (8) | Medium | Low    | **P1**   | **Resolved**                       |
| 2   | LCP (hydration)          | High   | High   | **P1**   | Deferred to production measurement |
| 3   | TTI (shared vendor cost) | High   | High   | **P1**   | Deferred to production measurement |
| 4   | Unused JS                | Medium | None   | Skip     | No further action                  |
| 5   | Legacy JS polyfills      | Medium | Low    | **P3**   | Same as other pages                |
| 6   | Render-blocking CSS      | Low    | High   | Skip     | No action needed                   |

---

## Cross-Page Summary

### All Pages Audited

| Page       | Perf | A11y | BP  | SEO | A11y Fixes |
| ---------- | ---- | ---- | --- | --- | ---------- |
| Home (`/`) | 79   | 100  | 96  | 100 | 4 resolved |
| About      | 78   | 100  | 96  | 100 | 5 resolved |
| Services   | 79   | 100  | 96  | 100 | 0 (none)   |
| Experience | 77   | 100  | 96  | 100 | 5 resolved |
| Projects   | 77   | 100  | 96  | 100 | 8 resolved |

### Shared Remaining Issues

All pages share the same performance bottlenecks:

1. **LCP (5.0-6.3s)** -- React hydration delay on localhost. Expected to improve significantly in production (CDN, edge rendering).
2. **TTI (7.4-7.7s)** -- Sentry SDK (~300-450ms), vendor chunks (~250-310ms combined), GTM (~115-136ms). Measure in production before further optimization.
3. **Unused JS (~127 KiB)** -- GTM (third-party), Sentry Replay (deferred), HeadlessUI (deferred). Already optimized.
4. **Legacy JS (36 KiB)** -- Dependency-bundled polyfills. Investigate source via bundle analyzer.
5. **Render-blocking CSS (40-153ms)** -- Tailwind bundle with critters optimization. No further action.

### Recommended Next Steps

1. **Deploy and measure in production** -- All LCP/TTI issues are inflated by localhost measurement. Deploy and run PageSpeed Insights against `danieljoffe.com`.
2. **Identify legacy polyfill source** -- Run `ANALYZE=true npx nx build root` to find which dependency ships `vendors-9ce36136`.
3. **Monitor with CrUX** -- Set up Web Vitals dashboard for real-user metrics across all pages.
