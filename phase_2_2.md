# Phase 2.2 — Report Page Implementation Plan

## Goal

Build the `/audit/r/[id]` report page — a server-rendered report that displays scan grades, scores, Core Web Vitals, prioritized issues, an email gate for the full report, and a CTA to book a consultation.

## Dependencies

- Phase 0 complete (Supabase tables, shared-audit lib, scan service, clients)
- Phase 1 complete (API routes: `GET /api/audit/report/[id]`, `POST /api/leads/capture`)
- Phase 2.1 complete (Scan landing page at `/audit` — triggers scans and redirects here)

---

## Design Decisions

### Route structure

The report page lives at `apps/root/src/app/audit/r/[id]/page.tsx`. This is a **server component** that fetches all data on the server (no client-side fetching for the report itself). Client components are used only for interactive parts (email gate form, CTA button).

### Data fetching

The page fetches report data directly from Supabase on the server (not via the API route). This avoids an unnecessary internal HTTP round-trip. The API route exists for external consumers and the polling flow.

### Component architecture

Split into server and client boundaries:

- **Server components** — page layout, metadata, score cards, Core Web Vitals, issue list, CTA
- **Client components** — `EmailGate` (form + reveal state), share button

### Email gate strategy

- First 3 issues are always visible
- Issues 4+ are blurred and gated behind email capture
- After email submission (or if lead already exists for this scan), all issues are revealed
- Gate state is client-side only — no auth/cookies needed
- The `POST /api/leads/capture` endpoint handles dedup (returns `already_captured` if duplicate)

### Grading & colors

Use `GRADE_MAP` from `@danieljoffe.com/shared-audit` for grade badge colors. Individual score cards use a color scale based on the 0-100 score:

- 90+ = green (`#63CAA5`)
- 75-89 = blue (`#8C8FFF`)
- 60-74 = orange (`#FFB46B`)
- 40-59 = red-pink (`#FF8CA0`)
- 0-39 = red (`#FF6B6B`)

This matches the grade thresholds from `calculateGrade`.

### Core Web Vitals thresholds

| Metric | Good    | Needs Improvement |
| ------ | ------- | ----------------- |
| FCP    | < 1.8s  | > 3s              |
| LCP    | < 2.5s  | > 4s              |
| TBT    | < 200ms | > 600ms           |
| CLS    | < 0.1   | > 0.25            |
| SI     | < 3.4s  | > 5.8s            |

---

## Steps

### Step 1 — Page Layout, Metadata & Data Fetching

**File:** `apps/root/src/app/audit/r/[id]/page.tsx`

Server component that:

1. Exports `generateMetadata` for dynamic SEO:
   ```typescript
   export async function generateMetadata({
     params,
   }: {
     params: Promise<{ id: string }>;
   }): Promise<Metadata> {
     const { id } = await params;
     // Fetch scan, return dynamic title/description/OG tags
   }
   ```
2. Fetches scan + issues from Supabase directly (no API route)
3. Returns 404 via `notFound()` if scan not found or not completed
4. Renders component tree: `ReportHeader` → `ScoreCards` → `CoreWebVitals` → `IssueList` → `CTASection`

**Data fetching (server-side):**

```typescript
const supabase = createServerSupabaseClient();
const { data: scan } = await supabase
  .from('scans')
  .select('id, url, ...(all score/metric fields)')
  .eq('id', id)
  .eq('status', 'completed')
  .single();

const { data: issues } = await supabase
  .from('scan_issues')
  .select('*')
  .eq('scan_id', id)
  .order('sort_order', { ascending: true });
```

---

### Step 2 — ReportHeader Component

**File:** `apps/root/src/app/audit/r/[id]/ReportHeader.tsx`

Server component that renders:

1. Back link: "← New audit" linking to `/audit`
2. Site info row:
   - Screenshot thumbnail (if `page_screenshot_url` exists), else a placeholder icon
   - Page title (or URL if no title)
   - Full URL (truncated, muted)
   - Scan date (formatted: "Feb 19, 2026")
3. Overall grade badge:
   - Large letter grade (A-F) with `GRADE_MAP` color as background
   - Grade label (e.g., "Good")

**Props:**

```typescript
interface ReportHeaderProps {
  url: string;
  pageTitle: string | null;
  screenshotUrl: string | null;
  gradeOverall: 'A' | 'B' | 'C' | 'D' | 'F';
  completedAt: string;
}
```

---

### Step 3 — ScoreCards Component

**File:** `apps/root/src/app/audit/r/[id]/ScoreCards.tsx`

Server component that renders 4 horizontal score cards in a responsive grid:

| Card           | Score field            | Label          |
| -------------- | ---------------------- | -------------- |
| Performance    | `score_performance`    | Performance    |
| Accessibility  | `score_accessibility`  | Accessibility  |
| SEO            | `score_seo`            | SEO            |
| Best Practices | `score_best_practices` | Best Practices |

Each card shows:

- Category label
- Score (0-100) in large text
- Circular progress indicator or colored bar showing the score
- Color based on score threshold (green/blue/orange/red)

**Layout:** Use shared-ui `Grid` with `cols={4}` (falls to 2-col on tablet, 1-col on mobile).

**Props:**

```typescript
interface ScoreCardsProps {
  performance: number | null;
  accessibility: number | null;
  seo: number | null;
  bestPractices: number | null;
}
```

---

### Step 4 — CoreWebVitals Component

**File:** `apps/root/src/app/audit/r/[id]/CoreWebVitals.tsx`

Server component that renders a section with 5 metric rows:

| Metric                   | Field    | Unit     | Good threshold |
| ------------------------ | -------- | -------- | -------------- |
| First Contentful Paint   | `fcp_ms` | seconds  | < 1.8s         |
| Largest Contentful Paint | `lcp_ms` | seconds  | < 2.5s         |
| Total Blocking Time      | `tbt_ms` | ms       | < 200ms        |
| Cumulative Layout Shift  | `cls`    | unitless | < 0.1          |
| Speed Index              | `si_ms`  | seconds  | < 3.4s         |

Each row shows:

- Metric name
- Value (formatted: ms → seconds where applicable, CLS as decimal)
- Pass/fail indicator (green check or red/orange indicator based on thresholds)

**Props:**

```typescript
interface CoreWebVitalsProps {
  fcpMs: number | null;
  lcpMs: number | null;
  tbtMs: number | null;
  cls: number | null;
  siMs: number | null;
}
```

---

### Step 5 — IssueList & EmailGate Components

**File:** `apps/root/src/app/audit/r/[id]/IssueList.tsx` (server component wrapper)
**File:** `apps/root/src/app/audit/r/[id]/EmailGate.tsx` (client component)
**File:** `apps/root/src/app/audit/r/[id]/IssueCard.tsx` (server component)

#### IssueList (server)

Receives the full issues array and splits it:

- `visibleIssues`: first 3 issues (always shown)
- `gatedIssues`: issues 4+ (shown blurred until email captured)
- Summary counts: `{ total, critical, warning, info }`

Renders `IssueCard` for each visible issue, then passes `gatedIssues` to `EmailGate`.

#### IssueCard (server)

Renders a single issue:

- Severity badge (critical = `error`, warning = `warning`, info = `info` variant)
- Category badge (e.g., "Performance", "Accessibility")
- Title
- Description
- Impact text (if present)
- Fix difficulty badge (easy = `success`, moderate = `warning`, complex = `error`)

**Props:** `{ issue: ScanIssue }`

#### EmailGate (client)

`'use client'` component that:

1. **Locked state:** Shows blurred issue cards with overlay:
   - "Unlock X more fixes"
   - Email input (required), name input (optional)
   - "Get full report" submit button
2. **Submitting state:** Button shows spinner
3. **Unlocked state:** Renders all gated issues clearly (no blur)

**State:**

```typescript
type GateState =
  | { phase: 'locked' }
  | { phase: 'submitting' }
  | { phase: 'unlocked' }
  | { phase: 'error'; message: string };
```

**API call:**

```typescript
const res = await fetch('/api/leads/capture', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, name, scan_id, source: 'full_report' }),
});
```

Handle `already_captured` response same as `captured` — reveal all issues.

**Props:**

```typescript
interface EmailGateProps {
  gatedIssues: ScanIssue[];
  scanId: string;
}
```

---

### Step 6 — CTASection Component

**File:** `apps/root/src/app/audit/r/[id]/CTASection.tsx`

Server component that renders:

1. Heading: "Want these fixed?"
2. Subtext: brief value proposition
3. CTA button: "Book a free discovery call" linking to Calendly URL
4. Author card: Daniel Joffe name + brief description

Uses existing `HOME_LINK` or Calendly URL from the services page pattern.

---

### Step 7 — Loading & Error States

**File:** `apps/root/src/app/audit/r/[id]/loading.tsx`

Loading state following existing pattern (spinner centered on page).

**File:** `apps/root/src/app/audit/r/[id]/error.tsx`

Error boundary following existing pattern (Sentry + reset button, scoped to `/audit/r/[id]`).

**File:** `apps/root/src/app/audit/r/[id]/not-found.tsx`

Custom 404 for invalid/missing scan IDs:

- "Report not found"
- "This scan may have expired or the URL is incorrect."
- Link back to `/audit` to run a new scan

---

### Step 8 — Tests

**Files:**

- `apps/root/src/app/audit/r/[id]/page.spec.tsx`
- `apps/root/src/app/audit/r/[id]/ReportHeader.spec.tsx`
- `apps/root/src/app/audit/r/[id]/ScoreCards.spec.tsx`
- `apps/root/src/app/audit/r/[id]/CoreWebVitals.spec.tsx`
- `apps/root/src/app/audit/r/[id]/IssueCard.spec.tsx`
- `apps/root/src/app/audit/r/[id]/EmailGate.spec.tsx`

**Test approach:**

- Mock `createServerSupabaseClient` for all server component data
- Mock `fetch` and `useRouter` for EmailGate client component
- Test each component independently with realistic data fixtures

**Key test cases:**

**page.spec.tsx:**

- Renders all sections (header, scores, vitals, issues, CTA)
- Passes correct data from scan to child components

**ReportHeader.spec.tsx:**

- Renders grade badge with correct color
- Renders page title and URL
- Renders scan date formatted
- Back link points to `/audit`

**ScoreCards.spec.tsx:**

- Renders all 4 score cards with labels
- Applies correct color class based on score threshold
- Handles null scores gracefully (shows "N/A")

**CoreWebVitals.spec.tsx:**

- Renders all 5 metrics
- Formats values correctly (ms → s, CLS as decimal)
- Shows pass/fail indicators based on thresholds
- Handles null values gracefully

**IssueCard.spec.tsx:**

- Renders severity badge
- Renders category badge
- Renders title, description, impact
- Renders fix difficulty badge

**EmailGate.spec.tsx:**

- Renders locked state with blur overlay and issue count
- Validates email before submit
- Submits to `/api/leads/capture` with correct payload
- Reveals issues on successful capture
- Handles `already_captured` response
- Handles error response with retry
- Shows spinner during submission

---

## Files Changed

| Action | File                                                    |
| ------ | ------------------------------------------------------- |
| Create | `apps/root/src/app/audit/r/[id]/page.tsx`               |
| Create | `apps/root/src/app/audit/r/[id]/ReportHeader.tsx`       |
| Create | `apps/root/src/app/audit/r/[id]/ScoreCards.tsx`         |
| Create | `apps/root/src/app/audit/r/[id]/CoreWebVitals.tsx`      |
| Create | `apps/root/src/app/audit/r/[id]/IssueList.tsx`          |
| Create | `apps/root/src/app/audit/r/[id]/IssueCard.tsx`          |
| Create | `apps/root/src/app/audit/r/[id]/EmailGate.tsx`          |
| Create | `apps/root/src/app/audit/r/[id]/CTASection.tsx`         |
| Create | `apps/root/src/app/audit/r/[id]/loading.tsx`            |
| Create | `apps/root/src/app/audit/r/[id]/error.tsx`              |
| Create | `apps/root/src/app/audit/r/[id]/not-found.tsx`          |
| Create | `apps/root/src/app/audit/r/[id]/page.spec.tsx`          |
| Create | `apps/root/src/app/audit/r/[id]/ReportHeader.spec.tsx`  |
| Create | `apps/root/src/app/audit/r/[id]/ScoreCards.spec.tsx`    |
| Create | `apps/root/src/app/audit/r/[id]/CoreWebVitals.spec.tsx` |
| Create | `apps/root/src/app/audit/r/[id]/IssueCard.spec.tsx`     |
| Create | `apps/root/src/app/audit/r/[id]/EmailGate.spec.tsx`     |

---

## Acceptance Criteria

- [x] `/audit/r/[id]` renders full report for a completed scan
- [x] Returns 404 for invalid/missing/non-completed scans
- [x] Dynamic `generateMetadata` produces correct title, description, OG tags
- [x] ReportHeader shows grade badge with correct `GRADE_MAP` color
- [x] ReportHeader shows page title, URL, screenshot (or placeholder), and scan date
- [x] 4 score cards display performance, accessibility, SEO, best practices scores
- [x] Score cards are color-coded based on score thresholds
- [x] Core Web Vitals section displays all 5 metrics with formatted values
- [x] Core Web Vitals shows pass/fail indicators based on thresholds
- [x] First 3 issues display fully visible
- [x] Issues 4+ are blurred behind email gate
- [x] Email gate submits to `POST /api/leads/capture` and reveals issues on success
- [x] Email gate handles `already_captured` response (reveals issues)
- [x] Email gate shows validation error for invalid email
- [x] CTA section renders with Calendly link
- [x] Back link navigates to `/audit`
- [x] Null scores/metrics handled gracefully (show "N/A" or skip)
- [x] Responsive layout (mobile-first, 320px+)
- [x] Uses existing design tokens (CSS variables, `GRADE_MAP` colors)
- [x] Loading state shows spinner
- [x] Error boundary catches runtime errors with Sentry
- [x] `npx nx test root` passes (existing + new tests)
- [x] `npx nx build root` succeeds

---

## Deviations from Execution Plan

| Area                   | Plan Says                    | Implementation Notes                                                       |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------- |
| Data fetching          | Fetch via API route          | Fetch directly from Supabase server-side (avoids internal HTTP round-trip) |
| Component location     | `app/audit/r/[id]/page.tsx`  | `apps/root/src/app/audit/r/[id]/page.tsx` (Nx monorepo path)               |
| Dynamic params         | `{ params: { id: string } }` | `{ params: Promise<{ id: string }> }` (Next.js 16 async params)            |
| Email gate             | "Blurred issue cards"        | CSS `blur` + overlay on gated issues container                             |
| CostOfInaction section | Listed in component tree     | Deferred — adds complexity, can be added later as enhancement              |
| Share button           | Mentioned in plan            | Deferred to post-MVP — focus on core report + email gate                   |
| Calendly embed         | CalendlyEmbed component      | Simple link to Calendly URL (embed adds unnecessary JS weight)             |
