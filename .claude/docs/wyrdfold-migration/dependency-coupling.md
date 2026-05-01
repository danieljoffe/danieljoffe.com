# Wyrdfold migration audit — dependency + coupling map

**Issue:** #589 (parent: #596 → #564)
**Scope:** `apps/root/src/app/fitted/**` plus the proxy/middleware gating it.
**Audit base:** `origin/chore/fitted-ui-refinements` @ `6a654157`

## Executive summary

Fitted is **strongly self-contained**. The coupling to portfolio code is shallow and predictable:

- **11 modules** outside `/fitted` are imported by Fitted code (full list below). All are infrastructure utilities: `cn`, supabase clients, focus trap, toast, button, dark-mode toggle, three insight/SSE/JSON helpers.
- **One reverse coupling exists**: `apps/root/src/hooks/useInsights.ts` imports types from `apps/root/src/app/fitted/(app)/insights/types.ts`. The hook lives outside Fitted but only Fitted uses it. This must move into Wyrdfold.
- **No portfolio route links** (`/blog`, `/about`, `/case-studies`, `/projects`, etc.) are referenced anywhere in `/fitted`. Clean.
- **No env vars** are read directly from `/fitted` components — env access is delegated to lib utilities and route handlers.
- **Branding strings** are limited to: page-title metadata (`'Fitted'` template, `'Sign in to Fitted'`), the layout's marketing description, and the `FittedSidebar` / `FittedAppLayout` / `FittedLayout` component names. Internal hrefs use `/fitted/...` and need root-relative rewrites.
- **Auth gating** lives in `apps/root/src/proxy.ts` (Next.js 16's renamed `middleware`) — the proxy keys on `/fitted/*` and references `/fitted/login` / `/fitted/auth` directly. Wyrdfold needs an equivalent at its own root.
- **Client/server split**: 39 `'use client'` files; 10 server-rendered shell files (page.tsx, loading.tsx). Healthy RSC posture.

The migration is **mostly mechanical rename + path rewrite**, with one pull-along (`useInsights`) and one rebuild (proxy). No tangled coupling that blocks the move.

## 1. Inbound: what `/fitted` imports from outside `/fitted`

Aggregated, with usage counts (`grep | uniq -c | sort -rn`):

| Count | Import | Destination in Wyrdfold |
|------:|--------|-------------------------|
| 25 | `@/components/Button` | Bring along — copy to `apps/wyrdfold/src/components/Button.tsx`. Custom Button enforces `name` lint rule; required. |
| 13 | `@/state/Toast/ToastProvider` (`useToast`) | Bring along — provider must mount in Wyrdfold's root layout. Heavy usage. |
| 6 | `@/lib/cn` | Bring along — trivial utility, copy verbatim. |
| 3 | `@/lib/supabase/auth-server` (`createAuthServerClient`) | **Rewrite** — must point at Wyrdfold's net-new Supabase project (per epic). |
| 2 | `@/lib/supabase/auth-client` (`createAuthBrowserClient`) | **Rewrite** — same as above. |
| 1 | `@/components/Nav/DarkModeToggle` | **Decision** — Wyrdfold ships a single Pyre theme (luminous chartreuse on near-black). Either drop the toggle or keep it for accessibility; recommend drop, since Pyre is the design (see `FittedSidebar.tsx:158, 267`). |
| 1 | `@/lib/parsePartialJson` | Bring along — used by streaming response parser. |
| 1 | `@/lib/consumeSse` | Bring along — used by SSE consumer. |
| 1 | `@/hooks/useInsights` | **Move into Wyrdfold** — see §2 below; this hook only has one consumer (Fitted insights) and reverse-couples to Fitted types. |
| 1 | `@/hooks/useFocusTrap` | Bring along — small hook, copy verbatim. |
| 1 | `@/hooks/useAdminTableFetch` | **Investigate** — name implies portfolio admin scope. Confirm Fitted is the only Wyrdfold-relevant consumer; if not Fitted-specific, copy. |
| — | `@danieljoffe.com/shared-ui/*` | Stays — see #593 audit for component inventory. |

### Full shared-ui consumption (for cross-reference with #593)

`Alert, Badge, Card, CardContent, Heading, Input, Modal, PageLayout, Pagination, ProgressBar, Section, Select, Sidebar, Skeleton, Spinner, StatsCard, Switch, Tabs, Text, Textarea`, plus `styles/formStyles`.

### Internal absolute import

`@/app/fitted/(app)/targets/types` is also imported absolutely (rather than relatively). Stylistic only — will become `@wyrdfold/...` on rename.

## 2. Outbound: what outside `/fitted` imports from `/fitted`

**Single occurrence:**

```
apps/root/src/hooks/useInsights.ts:9
  import { Period, PipelineInsights, SkillsCostInsights, TargetInsights }
    from '@/app/fitted/(app)/insights/types';
```

The hook is consumed by **only one place** outside itself: `InsightsDashboard.tsx` (inside Fitted).

**Action**: move `apps/root/src/hooks/useInsights.ts` into `apps/wyrdfold/src/app/(app)/insights/useInsights.ts` (or a `lib/` subdir there) during migration. Once moved, the inverse coupling disappears. After the move, delete `apps/root/src/hooks/useInsights.ts` from root.

## 3. Branding & metadata strings to rename

### Page metadata (`apps/root/src/app/fitted/.../page.tsx`)

| File | Title |
|------|-------|
| `(app)/page.tsx` | `Dashboard` |
| `(app)/jobs/page.tsx` | `Jobs` |
| `(app)/jobs/[id]/page.tsx` | `Job Detail` |
| `(app)/targets/page.tsx` | `Targets` |
| `(app)/targets/[id]/page.tsx` | `Target Detail` |
| `(app)/profile/page.tsx` | `Profile` |
| `(app)/insights/page.tsx` | `Insights` |
| `(app)/settings/page.tsx` | `Settings` |
| `login/page.tsx` | `Sign in to Fitted` → **rename to** `Sign in to Wyrdfold` |
| `onboarding/page.tsx` | `Get Started` |

### Root layout (`fitted/layout.tsx`)

```ts
title: { template: '%s | Fitted', default: 'Fitted' },
description: 'AI-powered job search command center — track, tailor, and apply with confidence.',
robots: { index: false, follow: false },
```

**Rename plan** (suggested — final copy is your call):

- `template: '%s | Wyrdfold'`, `default: 'Wyrdfold'`
- New description: lean on the Pyre brand language (e.g., "A workspace for evaluating roles, sharpening fit, and applying with intent.")
- Drop `robots: { index: false }` once Wyrdfold launches publicly (or keep for `dev.wyrdfold.com`).

### Component / function identifiers

- `FittedLayout`, `FittedAppLayout`, `FittedSidebar`, `FittedInsights`, `FittedSettings` → strip `Fitted` prefix or rename to `Wyrdfold`-prefixed.
- File names containing `Fitted` (e.g., `FittedSidebar.tsx`) — rename during port.

### URL/href occurrences

`/fitted/...` literals appear in:

- `FittedSidebar.tsx` (NAV_ITEMS) — 7 occurrences
- `insights/charts/ScoreDistributionChart.tsx:101` — `href={\`/fitted/jobs?minScore=...\`}`
- `insights/charts/FunnelChart.tsx:128` — `href={\`/fitted/jobs?status=...\`}`
- Other internal navigation throughout

**Wyrdfold** lives at `wyrdfold.com` root, so all `/fitted/...` references become root-relative (`/`, `/jobs`, `/targets`, etc.). Plan a single search-and-replace pass, plus the proxy rewrite below.

## 4. Auth gating (`apps/root/src/proxy.ts`)

The proxy (Next.js 16's renamed middleware) **keys explicitly on `/fitted`**:

- Line 15: `const FITTED_DEFAULT = '/fitted';`
- Line 126–127: explicit allowlist for `/fitted/login` and `/fitted/auth`
- Line 132: redirect when `user && pathname.startsWith('/fitted/login')`
- Line 146: `url.pathname = '/fitted/login';`
- Line 176: `if (request.nextUrl.pathname.startsWith('/fitted'))` — Supabase auth session refresh
- Line 200, 203: matcher config including `/fitted/:path*`

**Action**: Wyrdfold needs its own `proxy.ts` with the same shape but rooted at `/` (since wyrdfold.com is dedicated). Easier as a from-scratch port than a search-and-replace, because the matcher config differs (no need to exclude `/fitted` from a portfolio matcher — Wyrdfold's matcher is the whole app). Track in #588 (auth audit).

## 5. State providers consumed

Only **one** app-state provider is consumed by `/fitted`:

- `useToast` from `@/state/Toast/ToastProvider` — 13 sites. Wyrdfold needs `ToastProvider` mounted in its root layout.

No other providers (Analytics, FeatureFlag, Theme, etc.) are consumed today. PostHog (per epic) will be a new addition.

## 6. Custom hooks consumed

| Hook | Sites | Action |
|------|------:|--------|
| `useToast` | 13 | Bring along (provider) |
| `useFocusTrap` | 1 (`FittedSidebar.tsx`) | Bring along (small hook) |
| `useInsights` | 1 (`InsightsDashboard.tsx`) | Move into Wyrdfold (resolves reverse coupling) |
| `useAdminTableFetch` | 1 | Verify scope; copy if Fitted-only or generic |

Plus Next.js built-ins: `useRouter`, `usePathname`, `useSearchParams` (no action needed).

## 7. `lib/` utilities consumed

`cn`, `consumeSse`, `parsePartialJson`, `supabase/auth-client`, `supabase/auth-server`. All are mechanically portable. Supabase clients are the only ones needing rewiring (different project, different env vars).

## 8. Client/server boundary

- **Client** (`'use client'`): 39 files
- **Server**: 10 files (page.tsx + loading.tsx + layout.tsx + error.tsx)

Mostly correct posture: each `page.tsx` is a server component that delegates to a client `*Page.tsx` / `*Dashboard.tsx`. `(app)/layout.tsx` is server-rendered and performs an `auth.getUser()` backstop check after the proxy.

## 9. Sentry PII masking annotations

Only **2 `data-sentry-mask` / `data-sentry-unmask` occurrences** total inside `/fitted` (per `grep -c`). This is **suspiciously thin** for a surface that handles email addresses, resume contents, cover-letter drafts, and free-text profile data.

**Risk**: Cross-reference with #595 (platform readiness — security/PII section). Likely insufficient masking on:

- Profile / Settings forms
- Resume editor
- Cover letter editor
- Onboarding free-text fields
- Job notes / target descriptions

Not blocking for the migration itself, but the audit must complete before launch. Tagged for #595.

## 10. Feature flags / environment-gated code

**None found** inside `/fitted`. No `process.env.*` references in components, no feature-flag conditionals, no kill switches. The first PostHog feature flag (epic mentions `onboarding-v2`) will be a net-new addition.

## 11. `_components` directory (outside `(app)` route group)

`apps/root/src/app/fitted/_components/` contains `ConversationChat.tsx` and `ConversationChatModal.tsx`. Imported by onboarding flows. Imports only shared-ui + `@/components/Button` + lucide. No external coupling beyond what's already inventoried.

## Two tables (the deliverable)

### Inbound deps to bring along

| Source path | Action | Owner / risk |
|-------------|--------|--------------|
| `@/components/Button` | Copy verbatim | Trivial |
| `@/state/Toast/ToastProvider` (and provider) | Copy + mount in Wyrdfold root layout | Trivial |
| `@/lib/cn` | Copy verbatim | Trivial |
| `@/lib/parsePartialJson`, `@/lib/consumeSse` | Copy verbatim | Trivial |
| `@/lib/supabase/auth-client`, `auth-server` | Copy + rewire to Wyrdfold Supabase project + new env vars | Cross-ref #592 |
| `@/hooks/useFocusTrap` | Copy verbatim | Trivial |
| `@/hooks/useAdminTableFetch` | Verify scope; copy if generic | Low |
| `@/hooks/useInsights` (+ its consumed types) | **Move** into Wyrdfold; delete from root after | Resolves §2 reverse-coupling |
| `@/components/Nav/DarkModeToggle` | **Drop** (Pyre is single-theme) | Decision required |
| `@danieljoffe.com/shared-ui/*` | Stays in workspace | Cross-ref #593 |

### Outbound deps to rewrite (in `apps/root` after migration)

| Path | Action |
|------|--------|
| `apps/root/src/hooks/useInsights.ts` | Delete after move |
| `apps/root/src/proxy.ts` | Strip `/fitted/*` handling once `/fitted` routes are removed/redirected |
| Whatever decision lands for `apps/root/src/app/fitted/*` per epic (delete / redirect / freeze) | Tracked in epic #564 §4 |

## Branding-string rename list (the deliverable)

| Find | Replace |
|------|---------|
| `Fitted` (in titles, layout metadata) | `Wyrdfold` |
| `Sign in to Fitted` | `Sign in to Wyrdfold` |
| `template: '%s \| Fitted'` | `template: '%s \| Wyrdfold'` |
| layout description (job-search command center) | new Pyre-aligned copy |
| Component identifiers `Fitted*` | strip prefix or `Wyrdfold*` |
| File names `Fitted*.tsx` | strip prefix |
| `/fitted/*` href literals | root-relative (`/`, `/jobs`, etc.) |
| `proxy.ts` `/fitted/*` matchers and constants | new Wyrdfold-rooted proxy |
| `robots: { index: false }` | review at launch (keep for dev box) |

## Notes on collisions with the in-flight resume/cover-letter session

The other session is editing `ResumeEditor.tsx`, `CoverLetterSection.tsx`, and the backing `job-api` tailor service. **No impact on this audit** — coupling/branding inventory at the directory level is stable; the resume/cover-letter file edits change line content but do not alter the surface's import graph or branding shape.

---

_Audit complete. Findings actionable; no blockers identified for migration scaffolding (epic #564 Workstream 2)._
