# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 16 (App Router), React 19, and TypeScript. This is an Nx monorepo with pnpm workspaces.

Live site: https://danieljoffe.com

## Git Branching Strategy

- **`develop`** is the default base branch for all PRs. Feature branches merge into `develop`.
- **`main`** is the production branch. Only `develop` can be merged into `main`.
- Never open a PR targeting `main` directly from a feature branch.
- Create a new branch per issue: `feature/<feature-name>` from `main`.
- **Keep `develop` in sync with `main`**: Before creating or updating a PR targeting `develop`, check if `develop` is behind `main` (`git log develop..main --oneline`). If it is, merge `main` into `develop` and push. Flag any merge conflicts for the user instead of auto-resolving.

## Pre-Push Checklist

Before pushing any changes, **always** run the full unit test suite and typecheck:

```bash
pnpm tsc --noEmit         # Must have zero errors
pnpm nx test root         # All tests must pass
```

Do not push if either command fails. Fix the issue first.

## Commands

### Development

```bash
pnpm nx dev root                   # Start dev server at localhost:3000
pnpm nx build root                 # Build for production
pnpm nx start root                 # Start production server
```

### Testing

```bash
pnpm nx test root                  # Run unit tests
pnpm nx test root --watch          # Run tests in watch mode
pnpm nx test root -- --testPathPattern="Button"  # Run single test file
pnpm nx e2e root-e2e               # Run E2E tests (Playwright)
pnpm exec playwright test accessibility.spec.ts  # Run specific E2E test
pnpm test:coverage                 # Run all tests with coverage
pnpm test:lighthouse               # Run Lighthouse CI
```

### Linting & Formatting

```bash
pnpm lint                          # Lint all projects
pnpm lint:fix                      # Lint and auto-fix
pnpm format                        # Format with Prettier
pnpm typecheck                     # TypeScript type checking
```

### Quality Gate

```bash
pnpm pom                           # Full pipeline: typecheck → lint → format → test → coverage → e2e → Lighthouse
pnpm affected                      # Run lint, test, build, typecheck, e2e on affected projects only
```

### Storybook

```bash
pnpm nx storybook root             # Start Storybook for root app
pnpm nx storybook @danieljoffe.com/shared-ui  # Start Storybook for UI library
pnpm chromatic:ui                  # Push shared-ui Storybook to Chromatic
```

### Database (Supabase)

```bash
pnpm db:push                       # Push migrations to linked Supabase project
pnpm db:reset                      # Reset database to clean state
pnpm db:gen-types                  # Regenerate TypeScript types from schema
```

## Architecture

### Monorepo Structure

- **apps/root**: Main Next.js 16 application (App Router)
- **apps/root-e2e**: Playwright E2E tests
- **apps/audit-scan-service**: Express service for Lighthouse/axe audits (Puppeteer)
- **libs/shared/ui**: Shared React component library (@danieljoffe.com/shared-ui)
- **libs/shared/audit**: Shared audit types and utilities

### App Structure (apps/root/src/)

```
app/                    # Next.js App Router pages
├── api/
│   ├── audit/          # Audit scan, report, status, admin endpoints
│   ├── email/          # Contact form & email sequence endpoints
│   └── leads/          # Lead capture endpoint
├── home/               # Homepage components (Hero, Achievements, etc.)
├── about/              # About page
├── audit/              # Audit tool page
├── blog/               # Blog pages with dynamic [slug] routes
├── experience/         # Experience pages with dynamic [slug] routes
├── projects/           # Projects pages with dynamic [slug] routes
├── services/           # Services page
└── thank-you/          # Thank you pages
components/             # App-specific React components
├── kit/                # Shared UI primitives (Spinner, ErrorAlert, PostPagination, etc.)
data/                   # Content data and metadata
├── content/            # MDX content files (projects/, experience/, blog/)
├── contentRegistry.ts  # Unified content registry (single data access layer)
├── contentTypeConfig.ts # Per-type config (basePath, label, contentDir)
├── contentOrder.ts     # Chronological ordering arrays per content type
├── metadata/           # Page metadata (SEO, OpenGraph)
├── structuredData/     # JSON-LD structured data (blog + project auto-derived from MDX)
├── buildThumbnail.ts   # Derives PostThumbnail shape from MDX metadata
├── readingTimes.ts     # Pre-computed reading times per post
├── blog.ts, project.ts, experience.ts  # Slug constants per content type
├── profileData.ts      # Author profile data
├── services.ts, offerings.ts, about.ts # Page-specific data
└── __tests__/          # Data layer test fixtures
hooks/                  # Custom React hooks (useTableSort, useFocusTrap)
lib/                    # Utility libraries and configurations (cn, formStyles, badgeStyles)
state/                  # Global state management
types/                  # TypeScript type definitions
utils/                  # Helper functions and constants
```

### UI Library (libs/shared/ui/src/lib/)

Shared components: Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Container, CTACard, Divider, Dropdown, FormFieldError, Grid, GridBg, Heading, Input, Kbd, Loading, Modal, PageContainer, PageLayout, Pagination, ProgressBar, Section, SectionLabel, Select, Sidebar, Skeleton, Spacer, Spinner, Stack, StatsCard, StructuredData, Switch, Table, Tabs, Text, Textarea, ThemeProvider, ThemeToggle, Toast, Tooltip

### Key Technologies

- **Framework**: Next.js 16 with App Router
- **Styling**: Tailwind CSS 4
- **Animations**: GSAP
- **Forms**: react-hook-form with yup validation
- **Error Tracking**: Sentry (client: instrumentation-client.ts, server: sentry.server.config.ts, edge: sentry.edge.config.ts)
- **Analytics**: Vercel Analytics, Google Analytics
- **Testing**: Jest + React Testing Library (unit), Playwright (E2E), jest-axe (accessibility)

### Path Aliases

- `@/` maps to `apps/root/src/` in the root app
- `@danieljoffe.com/shared-audit` maps to `libs/shared/audit/src/index.ts`

## Nx Plugins

The workspace uses Nx plugins for automatic target inference:

- @nx/js/typescript (typecheck, build)
- @nx/next/plugin (build, dev, start)
- @nx/jest/plugin (test)
- @nx/playwright/plugin (e2e)
- @nx/eslint/plugin (lint)
- @nx/storybook/plugin (storybook, build-storybook)
- @nx/vite/plugin (vitest)
- @nx/docker (docker-build)

## Testing Notes

### Unit Tests

- Jest config: `apps/root/jest.config.ts`
- Setup file: `apps/root/src/test-setup.ts`
- GSAP plugins are mocked in `apps/root/__mocks__/`
- Coverage threshold: 50% minimum (branches, functions, lines, statements)

### E2E Tests

- Config: `apps/root-e2e/playwright.config.ts`
- Tests: accessibility, navigation, contact-form, performance, dynamic-routes, error-handling
- CI runs only Chromium; local runs all browsers + mobile

### Storybook Interaction Tests

- Stories with user interaction (dropdowns, modals, toggles, form inputs) should include a `play()` function using `@storybook/test` utilities (`userEvent`, `within`, `expect`, `waitFor`)
- Interaction tests verify accessibility contracts: focus management, ARIA state changes, keyboard navigation
- Run with `pnpm nx storybook @danieljoffe.com/shared-ui` — interaction tests execute in the browser panel

### CI Pipelines

- `ci.yml`: Runs on push to `develop` and PRs (except to `main`). Runs lint, typecheck, test, build, e2e (PR only), Chromatic, Lighthouse.
- `ci-preview.yml`: Runs on PRs to `main` (release validation). Requires source branch is `develop`.
- `ci.yml` uses a `changes` job with a shell-based file check to detect docs-only PRs. When only non-code files change (`*.md`, `.claude/*`, `.mcp.json`, `.vscode/*`, `.github/ISSUE_TEMPLATE/*`, `.github/prompts/*`, `.github/skills/*`, `.github/agents/*`, `.github/workflows/*`, `.husky/*`, `.prettierrc`, `.nvmrc`, `.sentryclirc`, `.editorconfig`, `.nxignore`, `LICENSE`), the `ci` job is skipped but the `ci-status` gate job still runs and passes. Push events to `develop` always run CI.
- Branch protection rulesets require `ci-status` (not `ci`) so docs-only PRs can merge without running the full suite.
- Snapshot regeneration: `workflow_dispatch` with `update-snapshots: true` on `ci.yml`.

## Sentry Integration

Use `import * as Sentry from "@sentry/nextjs"` for all Sentry functionality. Key patterns:

- Exception catching: `Sentry.captureException(error)`
- Tracing spans: `Sentry.startSpan({ op: 'ui.click', name: 'Button Click' }, span => { ... })`
- Logging: `const { logger } = Sentry` then `logger.info('message', { key: value })`

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Content Posts

### MDX File Structure

All content lives in `apps/root/src/data/content/`. Every MDX file **must** include an `export const metadata` block as its source-of-truth metadata. This is valid JS that works in both Turbopack (dev) and webpack (build) without rendering visible content:

```mdx
export const metadata = {
  title: 'Catchy, descriptive title',
  date: 'YYYY-MM-DD', // Projects: git creation date. Experience: employment start date.
  excerpt: 'One-sentence summary for previews and SEO',
  author: 'Daniel Joffe',
  category: 'Category Name', // e.g. 'Design Systems', 'Performance Engineering', 'Career Experience'
  tags: ['Tag1', 'Tag2'],
  slug: 'url-slug',
  type: 'project', // 'project' | 'experience'
  // Optional context fields (include when applicable):
  company: 'Company Name',
  role: 'Job Title',
  duration: 'Month YYYY - Month YYYY',
  industry: 'Industry / Sector',
};
```

Page-level SEO metadata is derived automatically from the MDX `metadata` export via `buildPostMetadata()` in `lib/buildPostMetadata.ts` — no separate metadata file needed for individual posts.

- **Projects** (`data/content/projects/`): `date` is the git creation date of the file. Query with `git log --diff-filter=A --follow --format="%ai" -- <file> | tail -1`.
- **Experience** (`data/content/experience/`): `date` is the employment start date (e.g. `2021-11-01` for "November 2021").

### Content Registry

All content access goes through `data/contentRegistry.ts` — the single source of truth for querying content:

```ts
import {
  getContentByType,
  getContentBySlug,
  getContentSlugs,
  getContentPagination,
  getAllContent,
} from '@/data/contentRegistry';

getContentByType('project'); // All project entries in display order
getContentBySlug('blog', slug); // Single entry by type + slug
getContentSlugs('experience'); // All slugs (for generateStaticParams)
getContentPagination('blog', s); // { prev, next } pagination links
getAllContent(); // Every entry across all types
```

Each entry contains: `slug`, `type`, `thumbnail`, `component`, `metadata`, `structuredData`, `readingTime`.

**Detail pages** use `getPostDetailProps(type, slug)` from `lib/getPostDetailProps.ts` + `PostDetailLayout` — a ~35-line pattern shared by all content types.

**Listing pages** use `getContentByType(type)` and map entries to `PostCard` props.

### Content Ordering

Chronological ordering arrays live in `data/contentOrder.ts`:

- **`projectHistory`**: Ordered by git creation date; entries sharing the same date are sub-sorted by the chronology of the work they describe. New projects must be inserted in the correct position.
- **`experienceHistory`**: Ordered by employment start date (earliest first). New entries must be inserted chronologically.
- **`blogHistory`**: Ordered by publish date (earliest first).

### Adding a New Post

MDX is the single source of truth for every content field that appears on the site — thumbnail title, excerpt, cover image, SEO, OG images, and structured data all derive from the same `export const metadata` block.

1. Create the `.mdx` file with an `export const metadata` block including the `cover` field (see format below).
2. Add the slug constant to `data/project.ts`, `data/experience.ts`, or `data/blog.ts`.
3. Import the MDX component **and metadata** in the corresponding `data/content/*/index.ts`.
4. Insert the slug into the correct position in `contentOrder.ts`.
5. For **experience** entries only: also add a hand-authored `ExperienceStructuredData` entry in `data/structuredData/experience.ts` (the `Role`/`worksFor` shape). Blog and project structured data are auto-derived from MDX metadata — no manual step.

The MDX `metadata` block must include at minimum:

```mdx
export const metadata = {
  title: 'Specific, outcome-driven title',
  date: 'YYYY-MM-DD',
  excerpt: 'One compelling sentence, ≤ 160 chars, no em dashes',
  author: 'Daniel Joffe',
  category: 'Category Name',
  tags: ['Tag1', 'Tag2'],
  slug: 'url-slug',
  type: 'blog', // or 'project' or 'experience'
  cover: {
    alt: 'Short accessible description of the image',
    src: '/photo-xxxxx',
    origin: 'https://unsplash.com/photos/<photo-permalink>',
    creator: '@unsplashHandle',
  },
  // Projects can also include: featured: true
  // Experience entries also require: company, role, duration, industry,
  //   logo, invert, and (optional) domain
};
```

### Thumbnail Images

- **Every post must have a unique cover image.** No two posts across any content type (blog, project, experience) may share the same Unsplash `src` photo ID. Before adding a thumbnail, grep the `data/content/` directory for the image ID (`rg "photo-<id>" apps/root/src/data/content`).
- Images come from Unsplash. The `src` field is the CDN path (e.g. `/photo-1555066931-4365d14bab8c`), `origin` is the Unsplash page URL, and `creator` is the photographer's handle.
- Choose images that visually relate to the post topic. Avoid generic "code on screen" images when a more specific visual is available.
- `cover` lives inside the MDX `metadata` export. There is no separate `*Thumbnails.ts` file — the `PostThumbnail` shape is derived at runtime via `data/buildThumbnail.ts`.

## ESLint

The workspace uses ESLint 10 with flat config (`apps/root/eslint.config.mjs`):

- **Custom rules**: `require-button-name` (enforces `name` prop on `<Button>`) and `no-raw-headings` (enforces heading components from kit instead of raw `<h1>`–`<h6>`)
- **Import ordering**: builtin → external → `@danieljoffe.com/*` → `@/*` → local (enforced by `import/order`)
- **Cycle detection**: `import/no-cycle` is enabled — circular imports are errors
- **Module boundaries**: `@nx/enforce-module-boundaries` restricts cross-project imports by project type/scope tags

## Coding Conventions

### Rule of Three

When the same pattern appears 3+ times across files, extract it:

| Pattern             | Extract to                        | Example                                                 |
| ------------------- | --------------------------------- | ------------------------------------------------------- |
| UI element          | Kit component (`components/kit/`) | `Spinner`, `ErrorAlert`, `FormFieldError`, `Pagination` |
| className string    | Shared styles (`lib/`)            | `formStyles.ts`, `badgeStyles.ts`                       |
| Stateful logic      | Custom hook (`hooks/`)            | `useTableSort`                                          |
| Magic number/string | `utils/constants.ts`              | `FORM_LIMITS`, `VALIDATION_PATTERNS`                    |

Test abstractions that contain logic. Pure style extractions don't need tests.

### Component Patterns

- **Button**: Always use `@/components/Button` for buttons and button-styled links. The `name` prop is required by lint (except in `.stories.tsx`). Use `as='link'` with `href` for navigation that looks like a button.
- **Shared UI library**: Before creating a new component, check `libs/shared/ui/src/lib/` for an existing one. Prefer `@danieljoffe.com/shared-ui` components over building app-specific equivalents. If a shared-ui component is close but not quite right, extend it in the library rather than duplicating locally. Only promote an app-specific pattern to shared-ui when the Rule of Three applies (3+ usages across apps/libs). **Important**: `shared-ui` must only depend on React and Tailwind CSS — no Next.js APIs (`Link`, `useRouter`, `next/image`, etc.).
- **Shared UI ref pattern (React 19)**: Do **not** use `forwardRef` in shared-ui components. Instead, accept `ref` as a regular prop via `ref?: Ref<HTMLElement>` in the props interface and destructure it alongside other props. This is the React 19 pattern — `forwardRef` is deprecated. Components that are pure (no hooks/state) work in both server and client contexts without `'use client'`. Do not create `Client*` wrapper components in the app just to add a client boundary for ref compatibility — that pattern is obsolete.
- **Kit components (Next.js-specific)**: Components that depend on Next.js APIs (`Link`, `useRouter`, `next/image`, `usePathname`, etc.) live in `components/kit/` or `components/` within the app. Import kit components from `@/components/kit` barrel export, not individual files. New kit components must be added to `kit/index.ts`.
- **Toast notifications**: Use `useToast()` from `@/state/Toast/ToastProvider` for user feedback on async actions (success, error, network).
- **`global-error.tsx`**: Uses inline styles intentionally (renders outside the app tree where Tailwind isn't available). Don't convert to Tailwind.

### Styling

- Use `cn()` from `@/lib/cn` for conditional class merging (never `.join(' ')` with ternaries).
- Static multi-line class arrays using `.join(' ')` for readability are acceptable when there are no conditionals.
- Tailwind CSS 4 uses `@theme` directive and oklch color space — reference `styles/theme.css` for design tokens.

### Accessibility & Privacy

- Form inputs with validation errors must have `aria-describedby` pointing to the error element's `id`.
- Use `<FormFieldError message={error} id='field-error' />` for consistent error display.
- Add `data-sentry-mask` to all form inputs that collect PII (email, name, password).

### TypeScript

- `exactOptionalPropertyTypes` is enabled. When a prop can receive `undefined` from an expression (e.g., `errors?.name?.message`), declare it as `prop: string | undefined`, not `prop?: string`.
- Pre-commit hooks run lint-staged (ESLint + Prettier) then full typecheck. Both must pass.

## Skills & Agents

The workspace includes Claude Code skills and agents for common workflows:

- **Skills** (`.claude/skills/`): Task-specific workflows invocable via `/skill-name` — includes `verify`, `gen-test`, `coverage-gaps`, `pr-review`, `write-content`, `security-review`, `storybook-check`, `batch-commit`, `deploy-preview`, `release-notes`, and more
- **Agents** (`.claude/agents/`): Focused review checklists spawned by skills like `pr-review` — includes `a11y-reviewer`, `content-reviewer`, `perf-reviewer`, `nx-reviewer`, `e2e-reviewer`
- **Docs** (`.claude/docs/`): Reference documentation like `content-style-guide.md`

## General Guidelines for working with NextJS

**When starting work on a Next.js project, ALWAYS call the `init` tool from
next-devtools-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.**
