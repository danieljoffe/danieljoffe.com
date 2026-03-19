# Kit Layout Migration Status

## What Changed

All 5 main pages migrated from modular component composition to saas-ui-kit layout patterns using inline sections with kit primitives.

### Pages Migrated

| Page       | Route          | Layout                                                            |
| ---------- | -------------- | ----------------------------------------------------------------- |
| Homepage   | `/` (page.tsx) | `PageLayout > Section + SectionLabel`                             |
| About      | `/about`       | `PageLayout > Section + SectionLabel + CTACard`                   |
| Services   | `/services`    | `PageLayout > Section + SectionLabel + CTACard + StructuredData`  |
| Experience | `/experience`  | `PageLayout > Section + SectionLabel + PostCard + StructuredData` |
| Projects   | `/projects`    | `PageLayout > Section + SectionLabel + PostCard + StructuredData` |

### MDX Slug Pages

- `/experience/[slug]` and `/projects/[slug]` now use `<article>` wrapper instead of `MainContent` (removed `space-y-24` gap)
- `mdx-components.tsx` registers styled MDX elements (h1-h4, p, lists, code, tables, blockquotes) matching saas-ui-kit typography

### Kit Components (`components/kit/`)

| Component        | Purpose                                                         |
| ---------------- | --------------------------------------------------------------- |
| `PageLayout`     | `<main>` wrapper: `max-w-3xl mx-auto py-16 lg:py-24 space-y-24` |
| `Section`        | Section container: `relative px-6 lg:px-0`                      |
| `SectionLabel`   | Icon + uppercase label + divider line                           |
| `CTACard`        | Branded CTA with centered heading/description                   |
| `PostCard`       | Unified project/experience card with cover image                |
| `CoverImage`     | Unsplash image wrapper with gradient overlay                    |
| `CompanyLogo`    | White-bg logo container (sm/md/lg sizes)                        |
| `KitLinkButton`  | Anchor button (primary/secondary variants)                      |
| `KitButton`      | Button element (primary/secondary variants)                     |
| `GridBg`         | Decorative grid background with brand glow                      |
| `StructuredData` | JSON-LD script helper                                           |

### Client Components

| Component            | Location                            | Purpose                                                |
| -------------------- | ----------------------------------- | ------------------------------------------------------ |
| `HeroActions`        | `home/HeroActions.tsx`              | "View case studies" + "Download resume" with analytics |
| `SocialLinks`        | `about/SocialLinks.tsx`             | Email, LinkedIn, GitHub links + resume download        |
| `ContactForm`        | `about/ContactForm.tsx`             | Dynamic import wrapper for `Contact/Form`              |
| `FAQ`                | `services/FAQ.tsx`                  | Accordion with single-open behavior                    |
| `HeroCTA`            | `services/HeroCTA.tsx`              | Calendly booking link with analytics                   |
| `ExperienceCardLink` | `experience/ExperienceCardLink.tsx` | Link card with analytics tracking                      |

## What Was Removed

### -Copy Directories (5)

All migration staging directories deleted after content merged into real routes.

### Old Modular Components (~30 files)

| Directory     | Removed Components                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------- |
| `home/`       | Hero, PreviousTeams, PreviousTeamsGrid, Achievements, Methodologies, CTA, CompanyLink, Blob, blob.module.scss |
| `services/`   | Hero, ServicesGrid, HowIWork, WhoIWorkWith, CTA                                                               |
| `about/`      | Hero, TechnicalExpertise, Timeline/, Mantra                                                                   |
| `projects/`   | OpenSourceCallout                                                                                             |
| `components/` | PostThumbnail/, ContentGrid                                                                                   |

### Test Files (~16 suites, ~106 tests)

All spec files testing the removed components were deleted.

### What Was Kept

- `MainContent` — still used by audit pages (`/audit`, `/audit/r/[id]`, `/audit/admin`)
- `ScrollToElement` — used for `?scrollTo=` URL parameter handling
- `Contact/Form` — about page contact form (imported by `ContactForm.tsx`)
- `PostBody`, `PostContent`, `BreadCrumbs` — used by MDX slug pages
- `Button` — used by `BreadCrumbs` and potentially other components

## Test Status

- **Unit tests**: 68 suites, 658 tests — all passing
- **E2E tests**: Updated selectors for new DOM structure
  - Services: service titles now `<p>` not headings, FAQ not in labeled section
  - Dynamic routes: PostCard links are `<a>` not wrapped in `<article>`
  - Visual regression baselines will need regeneration in CI

## Still Using `@danieljoffe.com/shared-ui`

The following still import from shared-ui directly:

- `layout.tsx` → `ThemeProvider`, `ToastProvider` (via `AppContext`)
- `PostBody.tsx` → `Stack`
- `PostContent.tsx` → `Container`
- `BreadCrumbs.tsx` → `Stack`
- `MainContent.tsx` → `cn` utility (only used by non-audit legacy consumers)
- `Contact/Form.tsx` → form components

### Audit Pages — Fully Migrated

All 24 audit files migrated from shared-ui to inline Tailwind:

- **Page wrappers**: `audit/page.tsx`, `audit/r/[id]/page.tsx`, `audit/admin/page.tsx` → `PageLayout`
- **Landing**: `ScanHero`, `HowItWorks`, `URLInputForm`, `ScanProgress` → inline Tailwind
- **Report**: `ReportHeader`, `ScoreCards`, `CoreWebVitals`, `IssueList`, `IssueCard`, `CTASection`, `ScanPending`, `ScanFailed`, `EmailGate`, `DeviceTabs`, `ExpandableScreenshot` → inline Tailwind
- **Admin**: `AdminDashboard`, `PasswordGate`, `StatsRow`, `ScansTable`, `LeadsTable` → inline Tailwind
- **Error/not-found**: 3 error boundaries + not-found → inline Tailwind (removed `AppButton` dependency)

## Potential Future Work

1. **Replace PostBody/BreadCrumbs** with kit equivalents
2. **Consolidate shared-ui usage** — evaluate which shared-ui components are still needed
3. **Add kit component tests** — the kit components currently have no unit tests
4. **Regenerate VR baselines** in CI after merge
5. **Remove MainContent** once no consumers remain
