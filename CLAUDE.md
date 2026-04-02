# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal portfolio website for Daniel Joffe built with Next.js 16 (App Router), React 19, and TypeScript. This is an Nx monorepo with Yarn workspaces.

Live site: https://danieljoffe.com

## Git Branching Strategy

- **`develop`** is the default base branch for all PRs. Feature branches merge into `develop`.
- **`main`** is the production branch. Only `develop` can be merged into `main`.
- Never open a PR targeting `main` directly from a feature branch.
- Create a new branch per issue: `feature/<feature-name>` from `main` or `develop`.

## Pre-Push Checklist

Before pushing any changes, **always** run the full unit test suite and typecheck:

```bash
node_modules/.bin/tsc --noEmit         # Must have zero errors
node_modules/.bin/nx test root         # All tests must pass
```

Do not push if either command fails. Fix the issue first.

## Commands

### Development

```bash
npx nx dev root                    # Start dev server at localhost:3000
npx nx build root                  # Build for production
npx nx start root                  # Start production server
```

### Testing

```bash
npx nx test root                   # Run unit tests
npx nx test root --watch           # Run tests in watch mode
npx nx test root -- --testPathPattern="Button"  # Run single test file
npx nx e2e root-e2e                # Run E2E tests (Playwright)
npx playwright test accessibility.spec.ts       # Run specific E2E test
yarn test:coverage                 # Run all tests with coverage
yarn test:lighthouse               # Run Lighthouse CI
```

### Linting & Formatting

```bash
yarn lint                          # Lint all projects
yarn lint:fix                      # Lint and auto-fix
yarn format                        # Format with Prettier
yarn typecheck                     # TypeScript type checking
```

### Storybook

```bash
npx nx storybook root              # Start Storybook for root app
npx nx storybook @danieljoffe.com/shared-ui  # Start Storybook for UI library
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
├── experience/         # Experience pages with dynamic [slug] routes
├── projects/           # Projects pages with dynamic [slug] routes
├── services/           # Services page
└── thank-you/          # Thank you pages
components/             # App-specific React components
├── kit/                # Shared UI primitives (Spinner, ErrorAlert, PostPagination, etc.)
data/                   # Content data and metadata
├── content/            # MDX content files (projects/, experience/)
├── contentOrder.ts     # Chronological ordering and prev/next pagination
├── metadata/           # Page metadata (SEO, OpenGraph)
├── structuredData/     # JSON-LD structured data
├── *Thumbnails.ts      # Thumbnail/cover records for content pages
└── *.ts                # Slug constants, profile data, services, etc.
hooks/                  # Custom React hooks (useTableSort, useFocusTrap)
lib/                    # Utility libraries and configurations (cn, formStyles, badgeStyles)
state/                  # Global state management
types/                  # TypeScript type definitions
utils/                  # Helper functions and constants
```

### UI Library (libs/shared/ui/src/lib/)

Shared components: Alert, AspectRatio, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Container, Divider, Dropdown, Grid, Input, Loading, Modal, PageContainer, Pagination, ProgressBar, Section, Select, Sidebar, Skeleton, Spacer, Spinner, Stack, StatsCard, Switch, Table, Tabs, Textarea, ThemeProvider, ThemeToggle, Toast, Tooltip

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

## Nx Plugins

The workspace uses Nx plugins for automatic target inference:

- @nx/next/plugin (build, dev, start)
- @nx/jest/plugin (test)
- @nx/playwright/plugin (e2e)
- @nx/eslint/plugin (lint)
- @nx/storybook/plugin (storybook, build-storybook)

## Testing Notes

### Unit Tests

- Jest config: `apps/root/jest.config.ts`
- Setup file: `apps/root/src/test-setup.ts`
- GSAP plugins are mocked in `apps/root/__mocks__/`
- Coverage threshold: 25% minimum (branches, functions, lines, statements)

### E2E Tests

- Config: `apps/root-e2e/playwright.config.ts`
- Tests: accessibility, navigation, contact-form, performance, dynamic-routes, error-handling
- CI runs only Chromium; local runs all browsers + mobile

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

### Content Ordering & Pagination

Chronological ordering and prev/next pagination are managed in `data/contentOrder.ts`:

- **`projectHistory`**: Ordered by git creation date; entries sharing the same date are sub-sorted by the chronology of the work they describe. New projects must be inserted in the correct position.
- **`experienceHistory`**: Ordered by employment start date (earliest first). New entries must be inserted chronologically.
- **`getProjectPagination(slug)`** / **`getExperiencePagination(slug)`**: Return `{ prev, next }` links for a given slug.

When adding a new post:

1. Create the `.mdx` file with an `export const metadata` block (see format above).
2. Add the slug constant to `data/project.ts` or `data/experience.ts`.
3. Add the thumbnail record to `projectThumbnails.ts` or `experienceThumbnails.ts`.
4. Import the MDX component **and metadata** in the corresponding `data/content/*/index.ts`.
5. Insert the slug into the correct position in `contentOrder.ts`.
6. Add structured data in `data/structuredData/`. (Page metadata is auto-generated from the MDX `metadata` export.)

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

## General Guidelings for working with NextJS

**When starting work on a Next.js project, ALWAYS call the `init` tool from
next-devtools-mcp FIRST to set up proper context and establish documentation
requirements. Do this automatically without being asked.**
