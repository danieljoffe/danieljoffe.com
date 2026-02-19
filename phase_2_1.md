# Phase 2.1 — Scan Landing Page Implementation Plan

## Goal

Build the `/audit` scan landing page — a hero section with URL input, animated scan progress, and a "How it works" section. This is the user's entry point to the audit tool.

## Dependencies

- Phase 0 complete (Supabase tables, shared-audit lib, scan service, clients)
- Phase 1 complete (API routes: scan trigger, status polling, report data, lead capture)

---

## Design Decisions

### Route structure

The page lives at `apps/root/src/app/audit/page.tsx`. This is a server component that renders client components for interactive parts (URL form, scan progress). The execution plan uses `/audit/r/[id]` for reports (Phase 2.2).

### Component architecture

Split into server and client boundaries following existing patterns:

- **Server component** (`page.tsx`) — static metadata, layout, social proof count query
- **Client components** — URL input form, scan progress, all interactive state

The page uses `PageContainer` and `MainContent` from shared-ui, matching the existing page pattern (e.g., services page).

### Styling

- Use existing CSS variables from `libs/shared/ui/src/styles/deep-teal/default.scss` (`--background`, `--accent`, `--foreground`, etc.)
- Use existing shared-ui components: `Container`, `Stack`, `Button`, `Input`, `ProgressBar`, `Spinner`
- Tailwind CSS 4 utility classes for layout and responsive design
- Mobile-first responsive design matching existing breakpoints (`sm:`, `md:`, `lg:`)
- Typography: Inter (body, via existing setup), Fraunces (display heading for the hero h1 — needs `font-fraunces` class or inline style)

### URL validation

- Client-side: use `isValidUrl` from `@danieljoffe.com/shared-audit` for immediate feedback before API call
- Server-side: the `POST /api/audit/scan` endpoint already validates via the same function

### Polling strategy

- Poll `GET /api/audit/status/[id]` every 2 seconds using `setInterval` in a `useEffect`
- Clean up interval on unmount or status terminal (`completed` | `failed`)
- On `completed`: redirect to `/audit/r/[scan_id]` via `router.push()`
- On `failed`: show error message with retry option

### Scan progress UX

Progress steps are **cosmetic** — they animate on a timed sequence, not tied to real backend progress. The backend only reports `pending` → `running` → `completed`/`failed`. The frontend animates 5 steps based on elapsed time to make the wait feel purposeful.

### Imports

- **Shared UI** — `Container`, `Stack`, `Button`, `Input`, `ProgressBar`, `Spinner` from `@danieljoffe.com/shared-ui`
- **Shared Audit** — `isValidUrl`, `normalizeUrl` from `@danieljoffe.com/shared-audit`
- **Next.js** — `useRouter` from `next/navigation`, `Metadata` from `next`
- **Supabase** — `createServerSupabaseClient` from `@/lib/supabase/server` (for social proof count)

---

## Steps

### Step 1 — Page Layout & Metadata

**File:** `apps/root/src/app/audit/page.tsx`

Server component that:

1. Exports static `metadata` for SEO:
   ```typescript
   export const metadata: Metadata = {
     title: 'Free Website Performance Audit | Daniel Joffe',
     description:
       'Paste your URL. Get a detailed performance, accessibility, and SEO report in 30 seconds. Free, no signup required.',
     openGraph: {
       title: 'Free Website Performance Audit',
       description:
         'Get a detailed performance, accessibility, and SEO report in 30 seconds.',
     },
   };
   ```
2. Queries Supabase for total completed scans count (social proof)
3. Renders `PageContainer` → `MainContent` → `ScanHero` + `HowItWorks`

**Social proof query:**

```typescript
const supabase = createServerSupabaseClient();
const { count } = await supabase
  .from('scans')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'completed');
```

Pass `scanCount` as a prop to `ScanHero`.

---

### Step 2 — ScanHero Component

**File:** `apps/root/src/app/audit/ScanHero.tsx`

Server component (no interactivity) that renders:

1. Headline: "Free website performance audit" (Fraunces font, large)
2. Subheadline: "Paste your URL. Get a detailed report in 30 seconds." (Inter, muted)
3. `<URLInputForm />` client component
4. Social proof line: "X sites audited" (only shown if count > 0)

**Layout:** Use `Container` with `size="md"` and `Stack` for vertical centering. The hero should be centered vertically on the viewport with generous padding (`py-20 md:py-32`).

---

### Step 3 — URLInputForm Client Component

**File:** `apps/root/src/app/audit/URLInputForm.tsx`

`'use client'` component that manages the full scan lifecycle:

**State:**

```typescript
type ScanState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'polling'; scanId: string; startTime: number }
  | { phase: 'error'; message: string };
```

**Idle phase:**

- URL text input with `https://` placeholder hint
- "Audit this site" submit button (uses shared-ui `Button` with `variant="primary"`)
- Client-side validation error below input (shown on blur or submit if URL is invalid)
- Input uses shared-ui `Input` component

**Submitting phase:**

- Button shows `Spinner` + "Starting scan..." text
- Button disabled to prevent double-submit

**Polling phase:**

- Replaces the form with `<ScanProgress />` component
- Starts polling `GET /api/audit/status/[scanId]` every 2 seconds
- On `completed`: `router.push(`/audit/r/${scanId}`)`
- On `failed`: transitions to error state

**Error phase:**

- Shows error message in an `Alert` component (variant="error")
- "Try again" button resets to idle state

**Cached scan shortcut:**
When `POST /api/audit/scan` returns `{ cached: true }`, skip the polling phase entirely and redirect immediately to `/audit/r/[scan_id]`.

**API call:**

```typescript
const res = await fetch('/api/audit/scan', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url, source: 'organic' }),
});
```

Handle 400 (invalid URL), 429 (rate limited), and 500 (server error) responses by transitioning to error state with the appropriate message.

---

### Step 4 — ScanProgress Component

**File:** `apps/root/src/app/audit/ScanProgress.tsx`

`'use client'` component that shows animated progress steps during the scan.

**Props:** `{ url: string }`

**Progress steps** (cosmetic, timed):
| Step | Label | Completes at |
|------|-------|-------------|
| 1 | "Launching browser..." | 2s |
| 2 | "Loading your page..." | 5s |
| 3 | "Measuring performance..." | 10s |
| 4 | "Checking accessibility..." | 15s |
| 5 | "Generating report..." | 20s |

Each step shows:

- A checkmark icon when complete (use `✓` or lucide-react `Check` icon)
- A spinner when in progress (use shared-ui `Spinner`)
- Muted text when pending

**Progress bar:** Use shared-ui `ProgressBar` component. Value increases smoothly from 0 to ~90% over 25 seconds (never reaches 100% until redirect). Use CSS `transition` for smooth animation rather than GSAP (simpler, no dependency for this case).

**Implementation:**

```typescript
const [elapsed, setElapsed] = useState(0);

useEffect(() => {
  const interval = setInterval(() => {
    setElapsed(prev => prev + 0.1);
  }, 100);
  return () => clearInterval(interval);
}, []);
```

Calculate progress percentage: `Math.min(90, (elapsed / 25) * 90)`.

Show the scanned URL below the progress steps so the user knows what's being audited.

---

### Step 5 — HowItWorks Component

**File:** `apps/root/src/app/audit/HowItWorks.tsx`

Server component (static content). Renders a 3-column grid below the hero:

| Step | Title            | Description                                                      |
| ---- | ---------------- | ---------------------------------------------------------------- |
| 1    | Paste your URL   | Enter any website address and we'll run a comprehensive audit    |
| 2    | Get your report  | Performance, accessibility, SEO, and best practices — all graded |
| 3    | Fix what matters | Prioritized recommendations with difficulty ratings              |

**Layout:** Use shared-ui `Grid` with `cols={3}` and `gap="lg"`. Each step is a `Card` with a step number badge, title, and description. Falls to single column on mobile (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).

Each step card uses:

- Step number in a rounded badge (e.g., accent-colored circle with number)
- `CardTitle` for the step title
- `CardContent` for the description

---

### Step 6 — Loading & Error States

**File:** `apps/root/src/app/audit/loading.tsx`

Loading state following existing pattern:

```typescript
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading audit page">
      <Spinner size="lg" />
    </div>
  );
}
```

**File:** `apps/root/src/app/audit/error.tsx`

Error boundary following existing pattern (Sentry + reset button):

```typescript
'use client';
import * as Sentry from '@sentry/nextjs';
// ... same pattern as other error.tsx files
```

---

### Step 7 — Fraunces Font Setup

Check if Fraunces is already configured in the app's font setup. If not:

**File:** `apps/root/src/app/layout.tsx` (modify)

Add Fraunces from `next/font/google` alongside the existing Inter setup. Apply as a CSS variable (`--font-fraunces`) on the `<html>` element. Use only for the hero headline via a utility class.

If Fraunces is already available, just use the existing class.

---

### Step 8 — Tests

**Files:**

- `apps/root/src/app/audit/URLInputForm.spec.tsx`
- `apps/root/src/app/audit/ScanProgress.spec.tsx`
- `apps/root/src/app/audit/HowItWorks.spec.tsx`
- `apps/root/src/app/audit/page.spec.tsx`

**Test approach:**

- Mock `fetch` for API calls in URLInputForm tests
- Mock `useRouter` from `next/navigation` for redirect assertions
- Mock `createServerSupabaseClient` for social proof count
- Test each component independently

**URLInputForm tests:**

- Renders input and submit button
- Shows validation error for invalid URL
- Submits valid URL and shows progress
- Handles cached scan redirect
- Handles rate limit error (429)
- Handles server error (500)
- Retry after error resets to idle state

**ScanProgress tests:**

- Renders all 5 steps
- Steps animate based on elapsed time
- Shows scanned URL

**HowItWorks tests:**

- Renders 3 steps with correct content

**page tests:**

- Renders ScanHero and HowItWorks
- Shows scan count when available

---

## Files Changed

| Action | File                                                                       |
| ------ | -------------------------------------------------------------------------- |
| Create | `apps/root/src/app/audit/page.tsx`                                         |
| Create | `apps/root/src/app/audit/ScanHero.tsx`                                     |
| Create | `apps/root/src/app/audit/URLInputForm.tsx`                                 |
| Create | `apps/root/src/app/audit/ScanProgress.tsx`                                 |
| Create | `apps/root/src/app/audit/HowItWorks.tsx`                                   |
| Create | `apps/root/src/app/audit/loading.tsx`                                      |
| Create | `apps/root/src/app/audit/error.tsx`                                        |
| Create | `apps/root/src/app/audit/URLInputForm.spec.tsx`                            |
| Create | `apps/root/src/app/audit/ScanProgress.spec.tsx`                            |
| Create | `apps/root/src/app/audit/HowItWorks.spec.tsx`                              |
| Create | `apps/root/src/app/audit/page.spec.tsx`                                    |
| Modify | `apps/root/src/app/layout.tsx` (add Fraunces font, if not already present) |

---

## Acceptance Criteria

- [x] `/audit` page renders with hero section, URL input, and "How it works"
- [x] URL input validates client-side before submitting (rejects invalid/private URLs)
- [x] Submitting a valid URL calls `POST /api/audit/scan` and shows progress
- [x] Cached scan result redirects immediately to `/audit/r/[scan_id]`
- [x] Progress animation shows 5 timed steps with checkmarks
- [x] Progress bar animates smoothly from 0% to ~90%
- [x] Polls `GET /api/audit/status/[id]` every 2 seconds during scan
- [x] Redirects to `/audit/r/[scan_id]` on scan completion
- [x] Shows error message with retry option on scan failure
- [x] Rate limit (429) shows user-friendly message
- [x] Social proof count displays when scans exist
- [x] Page has proper SEO metadata and Open Graph tags
- [x] Fully responsive (mobile-first: works on 320px+)
- [x] Uses existing design tokens (CSS variables, not hardcoded colors)
- [x] Loading state shows spinner
- [x] Error boundary catches runtime errors with Sentry
- [x] `npx nx test root` passes (existing + new tests)
- [x] `npx nx build root` succeeds

---

## Deviations from Execution Plan

| Area                 | Plan Says                       | Implementation Notes                                                                               |
| -------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Component location   | `app/audit/page.tsx`            | `apps/root/src/app/audit/page.tsx` (Nx monorepo path)                                              |
| Server client import | `createServerClient`            | `createServerSupabaseClient` (actual function name)                                                |
| Validation import    | `@/lib/audit/validation`        | `@danieljoffe.com/shared-audit` (shared lib)                                                       |
| Form library         | Not specified                   | Native form + `useState` (no react-hook-form — too simple for one input)                           |
| Progress animation   | Not specified                   | CSS transitions (not GSAP — overkill for a progress bar)                                           |
| Report route         | `/audit/r/[id]`                 | Redirect target; the report page itself is Phase 2.2                                               |
| Font                 | "Fraunces for display headings" | Will check if already configured; add if missing                                                   |
| Dynamic params       | `{ params: { id: string } }`    | N/A for this page (no dynamic segments), but report page (2.2) will need `Promise<{ id: string }>` |
