# Kit Layout Migration Status

## What Changed

All 5 main pages migrated from modular component composition to saas-ui-kit layout patterns using inline sections with kit primitives. All `@danieljoffe/shared-ui` imports have been removed from `apps/root/src/`.

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

## Shared-UI Migration (Complete)

All shared-ui imports replaced with local equivalents:

| Shared-UI Export | Replacement                                    |
| ---------------- | ---------------------------------------------- |
| `ThemeProvider`  | `@/state/Theme/ThemeProvider`                  |
| `useTheme`       | `@/state/Theme/ThemeProvider`                  |
| `ToastProvider`  | `@/state/Toast/ToastProvider`                  |
| `cn`             | `@/lib/cn` (clsx + tailwind-merge)             |
| `Button` types   | `@/types/buttonTypes` (local ButtonBase, etc.) |
| `Stack`          | `<div className='flex flex-col gap-N'>`        |
| `Section`        | `<section>` with inline Tailwind               |
| `PageContainer`  | `<div className='max-w-3xl mx-auto ...'>`      |
| `Container`      | `<div className='mx-auto w-full px-4 ...'>`    |
| `Card`           | `<div className='rounded-lg border ...'>`      |
| `Badge`          | `<span className='inline-flex ...'>`           |
| `Input`          | `<input>` with inline Tailwind styles          |
| `Textarea`       | `<textarea>` with inline Tailwind styles       |
| `Loading`        | Inline bouncing dots spinner                   |
| `Spinner`        | Inline `animate-spin` div                      |
| `Alert`          | Inline styled div                              |
| `ProgressBar`    | Inline `<progress>` + styled div               |
| `Tabs`           | Inline tab implementation                      |
| `theme.css`      | `@/styles/theme.css` (local copy)              |

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

## Test Status

- **Unit tests**: 68 suites, 658 tests — all passing
- **E2E tests**: Updated selectors for new DOM structure
  - Services: service titles now `<p>` not headings, FAQ not in labeled section
  - Dynamic routes: PostCard links are `<a>` not wrapped in `<article>`
  - Visual regression baselines will need regeneration in CI

## Potential Future Work

1. **Add kit component tests** — the kit components currently have no unit tests
2. **Regenerate VR baselines** in CI after merge
3. **Remove `MainContent` component** if no longer used
4. **Evaluate removing `libs/shared/ui`** from the workspace entirely
